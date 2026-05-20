/**
 * Star operations for the Registry SDK
 *
 * Stars are tracked per-user per-definition (not per-version).
 * All operations require authentication and are idempotent.
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type { StarResult } from '../types/responses.js';
import type { DefinitionType } from '../types/enums.js';
import { buildDefinitionPath } from '../config/validators.js';
import { starResultSchema } from '../types/schemas.js';

/**
 * Check if the authenticated user has starred a definition.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Version for URL resolution (defaults to latest). Stars are
 *   tracked per-definition, not per-version — the version only determines which
 *   definition record the API resolves.
 * @returns Star status with starred flag and count
 */
export async function getStatus(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version?: string,
): Promise<StarResult> {
  const path = `${buildDefinitionPath(type, name, version)}/star/status`;
  return http.get<StarResult>(path, undefined, { schema: starResultSchema });
}

/**
 * Star a definition. Idempotent — no-op if already starred.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Version for URL resolution (defaults to latest). Stars are
 *   tracked per-definition, not per-version.
 * @returns Star result with updated count
 */
export async function star(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version?: string,
): Promise<StarResult> {
  const path = `${buildDefinitionPath(type, name, version)}/star`;
  return http.post<StarResult>(path, undefined, { schema: starResultSchema, retryMutations: true });
}

/**
 * Unstar a definition. Idempotent — no-op if not starred.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Version for URL resolution (defaults to latest). Stars are
 *   tracked per-definition, not per-version.
 * @returns Star result with updated count
 */
export async function unstar(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version?: string,
): Promise<StarResult> {
  const path = `${buildDefinitionPath(type, name, version)}/star`;
  return http.delete<StarResult>(path, undefined, { schema: starResultSchema, retryMutations: true });
}
