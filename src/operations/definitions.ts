/**
 * Definition operations for the Registry SDK
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type {
  Definition,
  DefinitionListItem,
  ListDefinitionsQuery,
  GetDefinitionOptions,
  CreateDefinitionBody,
  UpdateDefinitionBody,
  DeprecateDefinitionBody,
  PublishResult,
} from '../types/definitions.js';
import type { DefinitionType } from '../types/enums.js';
import { buildDefinitionPath, validateDefinitionType, validateYamlSize, validatePagination } from '../config/validators.js';
import { definitionSchema } from '../types/schemas.js';
import { definitionListResponseSchema, publishResponseSchema } from '../types/response-schemas.js';
import { RegistryApiError, UnsupportedDefinitionSearchContractError, ValidationError } from '../errors/errors.js';
import { parseResponse } from '../http/parse-response.js';

/**
 * Paginated list response
 */
export interface DefinitionListResponse {
  definitions: DefinitionListItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore?: boolean;
}

/**
 * List definitions with filters and pagination.
 *
 * @param http - Registry HTTP client
 * @param query - Optional filters (type, status, search, visibility, limit, offset)
 * @returns Paginated list of definitions with total count
 */
export async function list(
  http: RegistryHttpClient,
  query?: ListDefinitionsQuery
): Promise<DefinitionListResponse> {
  if (query) {
    if (query.type) {
      validateDefinitionType(query.type);
    }
    validatePagination(query.limit, query.offset);
  }
  let normalizedQuery = query;
  if (query && (query.name !== undefined || query.match !== undefined)) {
    const { name, match, search } = query;
    if (match !== undefined && !['exact', 'prefix', 'text'].includes(match)) {
      throw new ValidationError('match must be exact, prefix, or text', { field: 'match' });
    }
    if (name !== undefined) {
      if (typeof name !== 'string' || !/^[\x20-\x7e]+$/.test(name) || name.length > 100 || name.trim().length === 0) {
        throw new ValidationError('name must contain 1-100 printable ASCII characters and be nonblank', { field: 'name' });
      }
      if (match === 'text' || search !== undefined) {
        throw new ValidationError('name cannot be combined with search or match=text', { field: 'name' });
      }
      normalizedQuery = { ...query, name: name.trim().toLowerCase() };
    } else if (match === 'exact' || match === 'prefix') {
      throw new ValidationError('exact and prefix matching require name', { field: 'name' });
    } else if (match === 'text' && (typeof search !== 'string' || !/^[\x20-\x7e]+$/.test(search) || search.length > 100 || search.trim().length === 0)) {
      throw new ValidationError('match=text requires 1-100 printable ASCII characters and nonblank search', { field: 'search' });
    }
    let capabilities: { contracts?: { definitionSearch?: unknown } };
    try {
      capabilities = await http.get('/capabilities');
    } catch (error) {
      if (error instanceof RegistryApiError && error.statusCode === 404) throw new UnsupportedDefinitionSearchContractError();
      throw error;
    }
    const supported = capabilities?.contracts?.definitionSearch;
    if (!Array.isArray(supported) || !supported.every((value) => typeof value === 'string') || !supported.includes('name-v1')) {
      throw new UnsupportedDefinitionSearchContractError();
    }
  }
  return parseResponse(definitionListResponseSchema, await http.get<DefinitionListResponse>('/definitions', normalizedQuery), 'definitions.list');
}

/**
 * Get a single definition by type and name.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version string (omit for latest published)
 * @param options - Optional flags (e.g., includeYaml)
 * @returns Full definition including metadata, YAML, and rendered markdown
 */
export async function get(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version?: string,
  options?: GetDefinitionOptions
): Promise<Definition> {
  const path = buildDefinitionPath(type, name, version);
  return parseResponse(definitionSchema, await http.get<Definition>(path, options), 'definitions.get');
}

/**
 * Create a new draft definition.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param body - Creation payload including YAML content and visibility
 * @returns The created definition in draft status
 */
export async function create(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  body: CreateDefinitionBody
): Promise<Definition> {
  validateYamlSize(body.yaml);
  const path = buildDefinitionPath(type, name);
  return parseResponse(definitionSchema, await http.post<Definition>(path, body), 'definitions.create');
}

/**
 * Update a draft definition.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version of the draft to update
 * @param body - Fields to update (yaml, visibility, description)
 * @returns The updated definition
 */
export async function update(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
  body: UpdateDefinitionBody
): Promise<Definition> {
  if (body.yaml) {
    validateYamlSize(body.yaml);
  }
  const path = buildDefinitionPath(type, name, version);
  return parseResponse(definitionSchema, await http.put<Definition>(path, body), 'definitions.update');
}

/**
 * Delete a draft definition.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version of the draft to delete
 */
export async function remove(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string
): Promise<void> {
  const path = buildDefinitionPath(type, name, version);
  await http.delete<void>(path);
}

/**
 * Publish a draft definition, making it discoverable.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version of the draft to publish
 * @returns `{ definition, warnings }` — the published definition plus any
 *   non-fatal warnings emitted during the publish (translation failure,
 *   safety scan failure, etc.). `warnings` is always an array, possibly empty.
 *
 * @remarks
 * **Breaking change in 0.29.0**: previously returned `Definition` directly.
 * Consumers that don't care about warnings can destructure: `const { definition } = await ...`.
 * A `TRANSLATION_FAILED` warning is the most consequential — it indicates the
 * definition was published but cannot be rendered until the YAML is fixed.
 */
export async function publish(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string
): Promise<PublishResult> {
  const path = `${buildDefinitionPath(type, name, version)}/publish`;
  // Use request() with rawEnvelope so we receive the full `{ data, warnings? }`
  // envelope. The publish endpoint is the only one that emits a top-level field
  // alongside `data`; everywhere else the SDK's default envelope-unwrapping is
  // the right behavior.
  type Envelope = { data: Definition; warnings?: Array<{ code: string; message: string; details?: Record<string, unknown> }> };
  const envelope = parseResponse(publishResponseSchema, await http.request<Envelope>('POST', path, undefined, { retryMutations: true,
    rawEnvelope: true, }), 'definitions.publish');
  return {
    definition: envelope.data,
    warnings: envelope.warnings ?? [],
  };
}

/**
 * Deprecate a published definition.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version to deprecate
 * @param body - Deprecation details (reason, replacement)
 * @returns The definition with status changed to deprecated
 */
export async function deprecate(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
  body: DeprecateDefinitionBody
): Promise<Definition> {
  const path = `${buildDefinitionPath(type, name, version)}/deprecate`;
  return parseResponse(definitionSchema, await http.post<Definition>(path, body, { retryMutations: true }), 'definitions.deprecate');
}

/**
 * Archive a deprecated definition.
 * This is a terminal state that removes the definition from discovery.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version to archive
 * @returns The definition with status changed to archived
 */
export async function archive(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
): Promise<Definition> {
  const path = `${buildDefinitionPath(type, name, version)}/archive`;
  return parseResponse(definitionSchema, await http.post<Definition>(path, {}, { retryMutations: true }), 'definitions.archive');
}
