/**
 * Dependency operations for the Registry SDK
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type { DependencyGraph, GetDependenciesOptions } from '../types/dependencies.js';
import type { DefinitionType } from '../types/enums.js';
import { buildDefinitionPath } from '../config/validators.js';
import { dependencyGraphSchema } from '../types/response-schemas.js';

/**
 * Get the dependency graph for a definition.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version
 * @param options - Options (e.g., depth limit)
 * @returns Dependency graph with nodes and edges
 */
export async function get(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
  options?: GetDependenciesOptions
): Promise<DependencyGraph> {
  const path = `${buildDefinitionPath(type, name, version)}/dependencies`;
  return http.get<DependencyGraph>(path, options, { schema: dependencyGraphSchema });
}

/**
 * Get definitions that depend on this definition.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version
 * @returns Reverse dependency graph showing dependents
 */
export async function getDependents(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string
): Promise<DependencyGraph> {
  const path = `${buildDefinitionPath(type, name, version)}/dependents`;
  return http.get<DependencyGraph>(path, undefined, { schema: dependencyGraphSchema });
}
