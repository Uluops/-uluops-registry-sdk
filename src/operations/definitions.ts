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
} from '../types/definitions.js';
import type { DefinitionType } from '../types/enums.js';
import { buildDefinitionPath, validateYamlSize, validatePagination } from '../config/validators.js';
import { definitionSchema } from '../types/schemas.js';
import { definitionListResponseSchema } from '../types/response-schemas.js';

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
    validatePagination(query.limit, query.offset);
  }
  return http.get<DefinitionListResponse>('/definitions', query, { schema: definitionListResponseSchema });
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
  return http.get<Definition>(path, options, { schema: definitionSchema });
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
  return http.post<Definition>(path, body, { schema: definitionSchema });
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
  return http.put<Definition>(path, body, { schema: definitionSchema });
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
 * @returns The definition with status changed to published
 */
export async function publish(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string
): Promise<Definition> {
  const path = `${buildDefinitionPath(type, name, version)}/publish`;
  return http.post<Definition>(path, undefined, { schema: definitionSchema });
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
  return http.post<Definition>(path, body, { schema: definitionSchema });
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
  return http.post<Definition>(path, {}, { schema: definitionSchema });
}
