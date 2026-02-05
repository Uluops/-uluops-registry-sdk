/**
 * Fork operations for the Registry SDK
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type {
  ForkDefinitionBody,
  ForkResponse,
  ForkableCheck,
  ForkLineage,
  CheckForkableOptions,
} from '../types/forks.js';
import type { DefinitionListItem } from '../types/definitions.js';
import type { DefinitionType } from '../types/enums.js';
import { buildDefinitionPath } from '../config/validators.js';

/**
 * Fork list response
 */
export interface ForkListResponse {
  items: DefinitionListItem[];
  total: number;
}

/**
 * Fork a definition to create a new one under your ownership
 */
export async function create(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
  body: ForkDefinitionBody
): Promise<ForkResponse> {
  const path = `${buildDefinitionPath(type, name, version)}/fork`;
  return http.post<ForkResponse>(path, body);
}

/**
 * Check if a definition can be forked
 */
export async function checkForkable(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
  options?: CheckForkableOptions
): Promise<ForkableCheck> {
  const path = `${buildDefinitionPath(type, name, version)}/forkable`;
  return http.get<ForkableCheck>(path, options);
}

/**
 * Get the fork lineage (ancestry chain) of a definition
 */
export async function getLineage(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string
): Promise<ForkLineage> {
  const path = `${buildDefinitionPath(type, name, version)}/lineage`;
  return http.get<ForkLineage>(path);
}

/**
 * List all forks derived from a definition
 */
export async function list(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string
): Promise<ForkListResponse> {
  const path = `${buildDefinitionPath(type, name, version)}/forks`;
  return http.get<ForkListResponse>(path);
}
