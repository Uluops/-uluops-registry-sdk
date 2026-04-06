/**
 * Analytics operations for definition effectiveness, health, lineage, and evolution.
 *
 * All responses are wrapped in `{ data: T }` envelopes by the API — the HTTP client
 * unwraps these automatically, so operations return the inner data directly.
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type {
  DefinitionEffectiveness,
  DefinitionHealth,
  EcosystemOverview,
  LineageResult,
  EvolutionResult,
  TranslationAnalyticsResult,
  CompareResult,
  DiffImpactResult,
} from '../types/analytics.js';

// ── Effectiveness ─────────────────────────────────────────────────

/**
 * Get effectiveness metrics for a definition version.
 * Includes pass rate, scores, taxonomy distribution, health score, and composition lift.
 */
export async function getEffectiveness(
  http: RegistryHttpClient,
  type: string,
  name: string,
  version?: string,
): Promise<DefinitionEffectiveness> {
  const query = version ? { version } : undefined;
  return http.get<DefinitionEffectiveness>(
    `/analytics/definitions/${type}/${name}/effectiveness`,
    query,
  );
}

// ── Health ─────────────────────────────────────────────────────────

/**
 * Get health grade (A-F) and issue profile for a definition version.
 * Health scores are provisional pending 90-day calibration.
 */
export async function getHealth(
  http: RegistryHttpClient,
  type: string,
  name: string,
  version?: string,
): Promise<DefinitionHealth> {
  const query = version ? { version } : undefined;
  return http.get<DefinitionHealth>(
    `/analytics/definitions/${type}/${name}/health`,
    query,
  );
}

// ── Ecosystem ─────────────────────────────────────────────────────

/**
 * Get ecosystem-wide overview: definition counts, aggregate health, top performers.
 */
export async function getEcosystemOverview(
  http: RegistryHttpClient,
): Promise<EcosystemOverview> {
  return http.get<EcosystemOverview>('/analytics/ecosystem/overview');
}

// ── Lineage ───────────────────────────────────────────────────────

/**
 * Get the lineage graph for a definition: versions and forks as a tree.
 */
export async function getLineage(
  http: RegistryHttpClient,
  type: string,
  name: string,
): Promise<LineageResult> {
  return http.get<LineageResult>(
    `/analytics/definitions/${type}/${name}/lineage`,
  );
}

// ── Evolution ─────────────────────────────────────────────────────

/**
 * Get version-over-version metrics with trend detection.
 */
export async function getEvolution(
  http: RegistryHttpClient,
  type: string,
  name: string,
): Promise<EvolutionResult> {
  return http.get<EvolutionResult>(
    `/analytics/definitions/${type}/${name}/evolution`,
  );
}

// ── Translation Analytics ─────────────────────────────────────────

/**
 * Get versions grouped by translator version with aggregate metrics.
 */
export async function getTranslation(
  http: RegistryHttpClient,
  type: string,
  name: string,
): Promise<TranslationAnalyticsResult> {
  return http.get<TranslationAnalyticsResult>(
    `/analytics/definitions/${type}/${name}/translation`,
  );
}

// ── Compare ───────────────────────────────────────────────────────

/**
 * Compare effectiveness across 2-5 definition versions side-by-side.
 */
export async function compare(
  http: RegistryHttpClient,
  type: string,
  name: string,
  versions: string[],
): Promise<CompareResult> {
  return http.get<CompareResult>(
    `/analytics/definitions/${type}/${name}/effectiveness/compare`,
    { versions: versions.join(',') },
  );
}

// ── Diff Impact ───────────────────────────────────────────────────

/**
 * Get structural diff combined with metric deltas between two versions.
 * Deltas are observational, not causal — caveats are always included.
 */
export async function getDiffImpact(
  http: RegistryHttpClient,
  type: string,
  name: string,
  fromVersion: string,
  toVersion: string,
): Promise<DiffImpactResult> {
  return http.get<DiffImpactResult>(
    `/analytics/definitions/${type}/${name}/diff/${fromVersion}/${toVersion}/impact`,
  );
}
