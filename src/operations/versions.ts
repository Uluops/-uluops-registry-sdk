/**
 * Version operations for the Registry SDK
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type { VersionListItem, VersionDiff, VersionDiffSummary, VersionFieldDiff, VersionUnifiedDiff } from '../types/versions.js';
import type { DefinitionType } from '../types/enums.js';
import { validateDefinitionType, validateDefinitionName, validateVersion, validatePagination } from '../config/validators.js';
import {
  versionsListResponseSchema,
  versionDiffSchema,
  versionDiffSummarySchema,
  versionFieldDiffSchema,
  versionUnifiedDiffSchema,
} from '../types/response-schemas.js';

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
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param options - Pagination options (limit, offset)
 * @returns Paginated list of version items with total count
 */
export async function list(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  options?: { limit?: number; offset?: number }
): Promise<VersionsListResponse> {
  validateDefinitionType(type);
  validateDefinitionName(name);
  if (options) validatePagination(options.limit, options.offset);
  return http.get<VersionsListResponse>(`/definitions/${type}/${name}/versions`, {
    ...(options?.limit !== undefined && { limit: String(options.limit) }),
    ...(options?.offset !== undefined && { offset: String(options.offset) }),
  }, { schema: versionsListResponseSchema });
}

/**
 * Compare two versions of a definition.
 * Returns a summary by default. Pass full=true for raw YAML content.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param fromVersion - Source version for comparison
 * @param toVersion - Target version for comparison
 * @param options - Diff options: full (raw YAML), format (sections, fields, unified)
 * @returns Diff result in the requested format
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

  // Select schema based on options — full=true always returns VersionDiff,
  // otherwise format determines the shape (default is summary).
  const schema = options?.full
    ? versionDiffSchema
    : options?.format === 'fields'
      ? versionFieldDiffSchema
      : options?.format === 'unified'
        ? versionUnifiedDiffSchema
        : versionDiffSummarySchema;

  return http.get<VersionDiff | VersionDiffSummary | VersionFieldDiff | VersionUnifiedDiff>(`/definitions/${type}/${name}/diff`, {
    from: fromVersion,
    to: toVersion,
    ...(options?.full === true && { full: 'true' }),
    ...(options?.format && options.format !== 'sections' && { format: options.format }),
  }, { schema });
}
