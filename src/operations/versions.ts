/**
 * Version operations for the Registry SDK
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type { VersionListItem, VersionDiff, VersionDiffSummary, VersionFieldDiff, VersionUnifiedDiff } from '../types/versions.js';
import type { DefinitionType } from '../types/enums.js';
import { validateDefinitionType, validateDefinitionName, validateVersion } from '../config/validators.js';

/**
 * Versions list response
 */
export interface VersionsListResponse {
  versions: VersionListItem[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * List all versions of a definition with optional pagination.
 */
export async function list(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  options?: { limit?: number; offset?: number }
): Promise<VersionsListResponse> {
  validateDefinitionType(type);
  validateDefinitionName(name);
  return http.get<VersionsListResponse>(`/definitions/${type}/${name}/versions`, {
    ...(options?.limit !== undefined && { limit: String(options.limit) }),
    ...(options?.offset !== undefined && { offset: String(options.offset) }),
  });
}

/**
 * Compare two versions of a definition.
 * Returns a summary by default. Pass full=true for raw YAML content.
 */
export async function diff(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  fromVersion: string,
  toVersion: string,
  options?: { full?: boolean; format?: 'sections' | 'fields' | 'unified' }
): Promise<VersionDiff | VersionDiffSummary | VersionFieldDiff | VersionUnifiedDiff> {
  validateDefinitionType(type);
  validateDefinitionName(name);
  validateVersion(fromVersion);
  validateVersion(toVersion);

  return http.get<VersionDiff | VersionDiffSummary | VersionFieldDiff | VersionUnifiedDiff>(`/definitions/${type}/${name}/diff`, {
    from: fromVersion,
    to: toVersion,
    ...(options?.full === true && { full: 'true' }),
    ...(options?.format && options.format !== 'sections' && { format: options.format }),
  });
}
