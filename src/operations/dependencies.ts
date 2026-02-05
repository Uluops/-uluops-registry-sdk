/**
 * Dependency operations for the Registry SDK
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type { DependencyGraph, GetDependenciesOptions } from '../types/dependencies.js';
import type { DefinitionType } from '../types/enums.js';
import { buildDefinitionPath } from '../config/validators.js';

/**
 * Get the dependency graph for a definition
 */
export async function get(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
  options?: GetDependenciesOptions
): Promise<DependencyGraph> {
  const path = `${buildDefinitionPath(type, name, version)}/dependencies`;
  return http.get<DependencyGraph>(path, options);
}

/**
 * Get definitions that depend on this definition
 */
export async function getDependents(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string
): Promise<DependencyGraph> {
  const path = `${buildDefinitionPath(type, name, version)}/dependents`;
  return http.get<DependencyGraph>(path);
}
