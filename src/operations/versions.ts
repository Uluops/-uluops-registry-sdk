/**
 * Version operations for the Registry SDK
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type { VersionListItem, VersionDiff, VersionDiffSummary, VersionFieldDiff, VersionUnifiedDiff, VersionCombinedDiff, VersionDiffOptions, VersionDiffResult } from '../types/versions.js';
import type { DefinitionType } from '../types/enums.js';
import { validateDefinitionType, validateDefinitionName, validateVersion, validatePagination } from '../config/validators.js';
import {
  versionsListResponseSchema,
  versionDiffSchema,
  versionDiffSummarySchema,
  versionFieldDiffSchema,
  versionUnifiedDiffSchema,
  versionCombinedDiffSchema,
} from '../types/response-schemas.js';
import { RegistryApiError, UnsupportedDiffContractError, ValidationError } from '../errors/errors.js';
import { parseResponse } from '../http/parse-response.js';

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
  return parseResponse(versionsListResponseSchema, await http.get<VersionsListResponse>(`/definitions/${type}/${encodeURIComponent(name)}/versions`, {
    ...(options?.limit !== undefined && { limit: String(options.limit) }),
    ...(options?.offset !== undefined && { offset: String(options.offset) }),
  }), 'versions.list');
}

/**
 * Compare two versions of a definition.
 * Returns a summary by default. Pass full=true for raw YAML content.
 */
export async function diff(http: RegistryHttpClient, type: DefinitionType, name: string, fromVersion: string, toVersion: string, options: { diffContract: 'combined-v1'; format: 'unified'; full: true }): Promise<Extract<VersionCombinedDiff, { full: true }>>;
export async function diff(http: RegistryHttpClient, type: DefinitionType, name: string, fromVersion: string, toVersion: string, options: { diffContract: 'combined-v1'; format: 'unified'; full?: false }): Promise<Extract<VersionCombinedDiff, { full: false }>>;
export async function diff(http: RegistryHttpClient, type: DefinitionType, name: string, fromVersion: string, toVersion: string, options: { full: true; format?: VersionDiffOptions['format']; diffContract?: never }): Promise<VersionDiff>;
export async function diff(http: RegistryHttpClient, type: DefinitionType, name: string, fromVersion: string, toVersion: string, options: { format: 'fields'; full?: false; diffContract?: never }): Promise<VersionFieldDiff>;
export async function diff(http: RegistryHttpClient, type: DefinitionType, name: string, fromVersion: string, toVersion: string, options: { format: 'unified'; full?: false; diffContract?: never }): Promise<VersionUnifiedDiff>;
export async function diff(http: RegistryHttpClient, type: DefinitionType, name: string, fromVersion: string, toVersion: string, options?: { format?: 'sections'; full?: false; diffContract?: never }): Promise<VersionDiffSummary>;
export async function diff(http: RegistryHttpClient, type: DefinitionType, name: string, fromVersion: string, toVersion: string, options?: VersionDiffOptions): Promise<VersionDiffResult>;
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
  options?: VersionDiffOptions
): Promise<VersionDiffResult> {
  validateDefinitionType(type);
  validateDefinitionName(name);
  validateVersion(fromVersion);
  validateVersion(toVersion);

  if (options?.diffContract !== undefined) {
    if (options.diffContract !== 'combined-v1') throw new UnsupportedDiffContractError();
    if (options.format !== 'unified') throw new ValidationError('combined-v1 requires format=unified');
    let capabilities: { contracts?: { diff?: unknown } };
    try {
      capabilities = await http.get('/capabilities');
    } catch (error) {
      if (error instanceof RegistryApiError && error.statusCode === 404) throw new UnsupportedDiffContractError();
      throw error;
    }
    if (!Array.isArray(capabilities?.contracts?.diff) || !capabilities.contracts.diff.includes('combined-v1')) {
      throw new UnsupportedDiffContractError();
    }
    const result = await http.get<unknown>(`/definitions/${type}/${encodeURIComponent(name)}/diff`, {
      from: fromVersion, to: toVersion, format: 'unified', diffContract: 'combined-v1',
      ...(options.full === true && { full: 'true' }),
    });
    if (!result || typeof result !== 'object' || !('diffContract' in result) || result.diffContract !== 'combined-v1') {
      throw new UnsupportedDiffContractError();
    }
    const parsed = parseResponse(versionCombinedDiffSchema, result, 'versions.diff');
    if (parsed.full !== (options.full === true)) throw new UnsupportedDiffContractError();
    return parsed;
  }

  // Select schema based on options — full=true always returns VersionDiff,
  // otherwise format determines the shape (default is summary).
  const schema = options?.full
    ? versionDiffSchema
    : options?.format === 'fields'
      ? versionFieldDiffSchema
      : options?.format === 'unified'
        ? versionUnifiedDiffSchema
        : versionDiffSummarySchema;

  return parseResponse(schema, await http.get<unknown>(`/definitions/${type}/${encodeURIComponent(name)}/diff`, {
    from: fromVersion,
    to: toVersion,
    ...(options?.full === true && { full: 'true' }),
    ...(options?.format && options.format !== 'sections' && { format: options.format }),
  }), 'versions.diff') as VersionDiff | VersionDiffSummary | VersionFieldDiff | VersionUnifiedDiff;
}
