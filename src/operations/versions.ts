/**
 * Version operations for the Registry SDK
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type { VersionListItem, VersionDiff } from '../types/versions.js';
import type { DefinitionType } from '../types/enums.js';
import { validateDefinitionType, validateDefinitionName, validateVersion } from '../config/validators.js';

/**
 * List all versions of a definition
 */
export async function list(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string
): Promise<VersionListItem[]> {
  validateDefinitionType(type);
  validateDefinitionName(name);
  return http.get<VersionListItem[]>(`/definitions/${type}/${name}/versions`);
}

/**
 * Compare two versions of a definition
 */
export async function diff(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  fromVersion: string,
  toVersion: string
): Promise<VersionDiff> {
  validateDefinitionType(type);
  validateDefinitionName(name);
  validateVersion(fromVersion);
  validateVersion(toVersion);

  return http.get<VersionDiff>(`/definitions/${type}/${name}/diff`, {
    from: fromVersion,
    to: toVersion,
  });
}
