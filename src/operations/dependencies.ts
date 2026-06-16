/**
 * Dependency operations for the Registry SDK
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type {
  DependencyGraphResponse,
  DependentsResponse,
  GetDependenciesOptions,
} from '../types/dependencies.js';
import type { DefinitionType } from '../types/enums.js';
import { buildDefinitionPath } from '../config/validators.js';
import {
  dependencyGraphResponseSchema,
  dependentsResponseSchema,
} from '../types/response-schemas.js';
import { parseResponse } from '../http/parse-response.js';

/**
 * Defensive ceiling on recursive parse depth (post-impl r2, CWE-674).
 *
 * The dependency graph parser uses `z.lazy()` and walks every nested
 * `dependencies[]` array synchronously. A malicious or pathological server
 * payload nested 10,000+ levels deep would exhaust the V8 call stack before
 * the parse returns. Production graphs run depth 7 max (live-verified
 * 2026-06-08), so a 50-level ceiling is ~7× the real-world maximum and still
 * far below the unsafe threshold.
 *
 * Enforced on the envelope's `maxDepth` field before the recursive parse runs,
 * so we reject the response before allocating the tree. A server returning a
 * depth above the ceiling will surface a `RangeError` to the caller rather
 * than silently hanging or crashing the process.
 */
const MAX_SAFE_GRAPH_DEPTH = 50;

/**
 * Get the dependency graph for a definition.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version
 * @param options - Options (e.g., depth limit)
 * @returns Envelope with root definition, recursive graph, flat list, and counts
 * @throws RangeError if the server-reported `maxDepth` exceeds MAX_SAFE_GRAPH_DEPTH
 * @throws ZodError if the response shape doesn't match `DependencyGraphResponse`
 */
export async function get(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
  options?: GetDependenciesOptions
): Promise<DependencyGraphResponse> {
  const path = `${buildDefinitionPath(type, name, version)}/dependencies`;
  const raw = await http.get<unknown>(path, options);

  // Pre-parse depth guard (CWE-674). The envelope's maxDepth field is a
  // shallow primitive validated separately by Zod below — read it before
  // the recursive parse runs to short-circuit DoS-shaped responses.
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'maxDepth' in raw &&
    typeof (raw as { maxDepth: unknown }).maxDepth === 'number' &&
    (raw as { maxDepth: number }).maxDepth > MAX_SAFE_GRAPH_DEPTH
  ) {
    throw new RangeError(
      `Dependency graph maxDepth ${String((raw as { maxDepth: number }).maxDepth)} exceeds safe ceiling ${String(MAX_SAFE_GRAPH_DEPTH)}`,
    );
  }

  return parseResponse(dependencyGraphResponseSchema, raw, 'dependencies.get');
}

/**
 * Get definitions that depend on this definition.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version
 * @returns Envelope with root definition, dependents array, and total count
 */
export async function getDependents(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string
): Promise<DependentsResponse> {
  const path = `${buildDefinitionPath(type, name, version)}/dependents`;
  return parseResponse(
    dependentsResponseSchema,
    await http.get<unknown>(path, undefined),
    'dependencies.getDependents',
  );
}
