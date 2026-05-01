/**
 * Analytics operations for definition effectiveness, health, lineage, and evolution.
 *
 * All responses are wrapped in `{ data: T }` envelopes by the API — the HTTP client
 * unwraps these automatically, so operations return the inner data directly.
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type { DefinitionType } from '../types/enums.js';
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
import {
  definitionEffectivenessSchema,
  definitionHealthSchema,
  ecosystemOverviewSchema,
  lineageResultSchema,
  evolutionResultSchema,
  translationAnalyticsResultSchema,
  compareResultSchema,
  diffImpactResultSchema,
} from '../types/response-schemas.js';

/** Build the analytics path prefix for definition-scoped endpoints. */
function analyticsPath(type: DefinitionType, name: string): string {
  return `/analytics/definitions/${type}/${name}`;
}

// ── Effectiveness ─────────────────────────────────────────────────

/**
 * Get effectiveness metrics for a definition version.
 * Includes pass rate, scores, taxonomy distribution, health score, and composition lift.
 */
export async function getEffectiveness(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version?: string,
): Promise<DefinitionEffectiveness> {
  const query = version ? { version } : undefined;
  return http.get<DefinitionEffectiveness>(
    `${analyticsPath(type, name)}/effectiveness`,
    query,
    { schema: definitionEffectivenessSchema },
  );
}

// ── Health ─────────────────────────────────────────────────────────

/**
 * Get health grade (A-F) and issue profile for a definition version.
 * Health scores are provisional pending 90-day calibration.
 */
export async function getHealth(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version?: string,
): Promise<DefinitionHealth> {
  const query = version ? { version } : undefined;
  return http.get<DefinitionHealth>(
    `${analyticsPath(type, name)}/health`,
    query,
    { schema: definitionHealthSchema },
  );
}

// ── Ecosystem ─────────────────────────────────────────────────────

/**
 * Get ecosystem-wide overview: definition counts, aggregate health, top performers.
 */
export async function getEcosystemOverview(
  http: RegistryHttpClient,
): Promise<EcosystemOverview> {
  return http.get<EcosystemOverview>('/analytics/ecosystem/overview', undefined, { schema: ecosystemOverviewSchema });
}

// ── Lineage ───────────────────────────────────────────────────────

/**
 * Get the lineage graph for a definition: versions and forks as a tree.
 */
export async function getLineage(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
): Promise<LineageResult> {
  return http.get<LineageResult>(
    `${analyticsPath(type, name)}/lineage`,
    undefined,
    { schema: lineageResultSchema },
  );
}

// ── Evolution ─────────────────────────────────────────────────────

/**
 * Get version-over-version metrics with trend detection.
 */
export async function getEvolution(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
): Promise<EvolutionResult> {
  return http.get<EvolutionResult>(
    `${analyticsPath(type, name)}/evolution`,
    undefined,
    { schema: evolutionResultSchema },
  );
}

// ── Translation Analytics ─────────────────────────────────────────

/**
 * Get versions grouped by translator version with aggregate metrics.
 */
export async function getTranslation(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
): Promise<TranslationAnalyticsResult> {
  return http.get<TranslationAnalyticsResult>(
    `${analyticsPath(type, name)}/translation`,
    undefined,
    { schema: translationAnalyticsResultSchema },
  );
}

// ── Compare ───────────────────────────────────────────────────────

/**
 * Compare effectiveness across 2-5 definition versions side-by-side.
 */
export async function compare(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  versions: string[],
): Promise<CompareResult> {
  if (versions.length < 2 || versions.length > 5) {
    throw new Error(`compare() requires 2-5 versions (received ${String(versions.length)})`);
  }
  return http.get<CompareResult>(
    `${analyticsPath(type, name)}/effectiveness/compare`,
    { versions: versions.join(',') },
    { schema: compareResultSchema },
  );
}

// ── Diff Impact ───────────────────────────────────────────────────

/**
 * Get structural diff combined with metric deltas between two versions.
 * Deltas are observational, not causal — caveats are always included.
 */
export async function getDiffImpact(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  fromVersion: string,
  toVersion: string,
): Promise<DiffImpactResult> {
  return http.get<DiffImpactResult>(
    `${analyticsPath(type, name)}/diff/${fromVersion}/${toVersion}/impact`,
    undefined,
    { schema: diffImpactResultSchema },
  );
}
