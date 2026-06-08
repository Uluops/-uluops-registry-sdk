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

/**
 * Get the dependency graph for a definition.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version
 * @param options - Options (e.g., depth limit)
 * @returns Envelope with root definition, recursive graph, flat list, and counts
 */
export async function get(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
  options?: GetDependenciesOptions
): Promise<DependencyGraphResponse> {
  const path = `${buildDefinitionPath(type, name, version)}/dependencies`;
  return dependencyGraphResponseSchema.parse(
    await http.get<unknown>(path, options)
  );
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
  return dependentsResponseSchema.parse(
    await http.get<unknown>(path, undefined)
  );
}
