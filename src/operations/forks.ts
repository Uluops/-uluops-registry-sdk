/**
 * Fork operations for the Registry SDK
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type {
  Fork,
  ForkSummary,
  ForkDefinitionBody,
  ForkResponse,
  ForkableCheck,
  ForkLineage,
  CheckForkableOptions,
} from '../types/forks.js';
import type { DefinitionType } from '../types/enums.js';
import { buildDefinitionPath } from '../config/validators.js';
import { forkResponseSchema, forkableCheckSchema, forkLineageSchema, forkListResponseSchema } from '../types/response-schemas.js';
import { parseResponse } from '../http/parse-response.js';

/**
 * A single fork entry returned by the list-forks endpoint.
 * The `definition` may be null when the forked definition has been deleted.
 */
export interface ForkEntry {
  fork: Fork;
  definition: ForkSummary | null;
}

/**
 * Fork list response — contains the list of forked definitions and their count.
 */
export interface ForkListResponse {
  forks: ForkEntry[];
  totalForks: number;
}

/**
 * Fork a definition to create a new one under your ownership.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Source definition name
 * @param version - Source version to fork from
 * @param body - Fork options (new name, visibility)
 * @returns Fork response with the newly created definition
 */
export async function create(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
  body: ForkDefinitionBody
): Promise<ForkResponse> {
  const path = `${buildDefinitionPath(type, name, version)}/fork`;
  return parseResponse(forkResponseSchema, await http.post<ForkResponse>(path, body), 'forks.create');
}

/**
 * Check if a definition can be forked.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version to check
 * @param options - Options (e.g., target name to check for conflicts)
 * @returns Forkable status with reasons if not forkable
 */
export async function isForkable(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
  options?: CheckForkableOptions
): Promise<ForkableCheck> {
  const path = `${buildDefinitionPath(type, name, version)}/forkable`;
  return parseResponse(forkableCheckSchema, await http.get<ForkableCheck>(path, options), 'forks.isForkable');
}

/**
 * Get the fork ancestry chain of a definition.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version
 * @returns Fork lineage with ancestor chain
 */
export async function getAncestry(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string
): Promise<ForkLineage> {
  const path = `${buildDefinitionPath(type, name, version)}/lineage`;
  return parseResponse(forkLineageSchema, await http.get<ForkLineage>(path, undefined), 'forks.getAncestry');
}

/**
 * List all forks derived from a definition.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version
 * @returns List of forked definitions with total count
 */
export async function list(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string
): Promise<ForkListResponse> {
  const path = `${buildDefinitionPath(type, name, version)}/forks`;
  return parseResponse(forkListResponseSchema, await http.get<ForkListResponse>(path, undefined), 'forks.list');
}
