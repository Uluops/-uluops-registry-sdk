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
 * List definitions with filters and pagination
 */
export async function list(
  http: RegistryHttpClient,
  query?: ListDefinitionsQuery
): Promise<DefinitionListResponse> {
  if (query) {
    validatePagination(query.limit, query.offset);
  }
  return http.get<DefinitionListResponse>('/definitions', query);
}

/**
 * Get a single definition by type and name
 * Optionally specify a version with name@version format
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
 * Create a new draft definition
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
 * Update a draft definition
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
 * Delete a draft definition
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
 * Publish a draft definition
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
 * Deprecate a published definition
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

export async function archive(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
): Promise<Definition> {
  const path = `${buildDefinitionPath(type, name, version)}/archive`;
  return http.post<Definition>(path, {}, { schema: definitionSchema });
}
