/**
 * Analytics operations for definition effectiveness, health, lineage, and evolution.
 *
 * All responses are wrapped in `{ data: T }` envelopes by the API — the HTTP client
 * unwraps these automatically, so operations return the inner data directly.
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type { DefinitionType } from '../types/enums.js';
import { validateDefinitionType, validateDefinitionName, validateVersion } from '../config/validators.js';
import { ValidationError } from '../errors/errors.js';
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
import { parseResponse } from '../http/parse-response.js';

/** Build the analytics path prefix for definition-scoped endpoints. */
function analyticsPath(type: DefinitionType, name: string): string {
  validateDefinitionType(type);
  validateDefinitionName(name);
  return `/analytics/definitions/${type}/${encodeURIComponent(name)}`;
}

// ── Effectiveness ─────────────────────────────────────────────────

/**
 * Get effectiveness metrics for a definition version.
 * Includes pass rate, scores, taxonomy distribution, health score, and composition lift.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version (omit for latest)
 * @returns Effectiveness metrics with scores, pass rate, and taxonomy breakdown
 */
export async function getEffectiveness(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version?: string,
): Promise<DefinitionEffectiveness> {
  if (version) validateVersion(version);
  const query = version ? { version } : undefined;
  return parseResponse(definitionEffectivenessSchema, await http.get<DefinitionEffectiveness>(
    `${analyticsPath(type, name)}/effectiveness`,
    query,
  ), 'analytics.getEffectiveness');
}

// ── Health ─────────────────────────────────────────────────────────

/**
 * Get health grade (A-F) and issue profile for a definition version.
 * Health scores are provisional pending 90-day calibration.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version (omit for latest)
 * @returns Health grade, issue counts, and staleness indicators
 */
export async function getHealth(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version?: string,
): Promise<DefinitionHealth> {
  if (version) validateVersion(version);
  const query = version ? { version } : undefined;
  return parseResponse(definitionHealthSchema, await http.get<DefinitionHealth>(
    `${analyticsPath(type, name)}/health`,
    query,
  ), 'analytics.getHealth');
}

// ── Ecosystem ─────────────────────────────────────────────────────

/**
 * Get ecosystem-wide overview: definition counts, aggregate health, top performers.
 *
 * @param http - Registry HTTP client
 * @returns Ecosystem overview with counts, health distribution, and top definitions
 */
export async function getEcosystemOverview(
  http: RegistryHttpClient,
): Promise<EcosystemOverview> {
  return parseResponse(ecosystemOverviewSchema, await http.get<EcosystemOverview>('/analytics/ecosystem/overview', undefined), 'analytics.getEcosystemOverview');
}

// ── Lineage ───────────────────────────────────────────────────────

/**
 * Defensive ceiling on the depth of the lineage tree the SDK will recursively
 * validate (CWE-674).
 *
 * `lineageResultSchema.root` is a `z.lazy()` `LineageNode` whose `versions[]`
 * and `forks[]` arrays recurse into further `LineageNode`s. A pathological or
 * malicious server payload nested thousands of levels deep would exhaust the V8
 * call stack during the recursive Zod parse — empirically ~2,200 levels on a
 * main-thread stack and ~1,100 on a worker thread (Node 24) — before the parse
 * returns, crashing the process rather than surfacing an error.
 *
 * The legitimate analytics lineage endpoint returns a FLAT tree: a root plus a
 * single layer of version/fork children (depth 2), with forks capped server-side
 * at 100 per definition and fork chains at depth 10. A ceiling of 50 is 5× the
 * server's own fork-chain cap and ~20× below the worker-thread overflow
 * threshold, mirroring the `MAX_SAFE_GRAPH_DEPTH` ceiling the dependency-graph
 * parser uses.
 */
const MAX_SAFE_LINEAGE_DEPTH = 50;

/**
 * Defensive ceiling on total node count, guarding against a shallow-but-enormous
 * (high-breadth) payload that the depth ceiling alone would not catch. At
 * ~850 bytes per parsed node this bounds a worst-case tree to ~85 MB of heap,
 * still ~100× larger than any legitimate lineage tree.
 */
const MAX_SAFE_LINEAGE_NODES = 100_000;

/** Options for {@link getLineage}. */
export interface GetLineageOptions {
  /**
   * Client-side ceiling on lineage tree depth this call will accept, for callers
   * who want to fail fast on unexpectedly deep trees as defense-in-depth. Clamped
   * to `[1, 50]` — values above the hard safety ceiling are reduced to it, and the
   * guard always runs at the hard ceiling regardless. The legitimate analytics
   * endpoint returns depth-2 trees, so this is a forward-looking control rather
   * than a payload reducer.
   */
  maxDepth?: number;
}

/**
 * Pre-parse guard (CWE-674). Walks the raw lineage tree ITERATIVELY (explicit
 * stack — cannot itself overflow) to reject DoS-shaped responses before the
 * recursive Zod parse allocates the tree. Shape mismatches are left for Zod to
 * report; this guard only enforces the depth and node-count ceilings.
 *
 * @throws {RangeError} If the tree exceeds `maxDepth` levels or `MAX_SAFE_LINEAGE_NODES` nodes
 */
function assertLineageWithinBounds(raw: unknown, maxDepth: number): void {
  if (typeof raw !== 'object' || raw === null || !('root' in raw)) return;
  const root = (raw as { root: unknown }).root;
  if (typeof root !== 'object' || root === null) return;

  const stack: Array<{ node: unknown; depth: number }> = [{ node: root, depth: 1 }];
  let nodes = 0;
  while (stack.length > 0) {
    const { node, depth } = stack.pop() as { node: unknown; depth: number };
    if (typeof node !== 'object' || node === null) continue;

    nodes += 1;
    if (depth > maxDepth) {
      throw new RangeError(`Lineage tree depth exceeds safe ceiling ${String(maxDepth)}`);
    }
    if (nodes > MAX_SAFE_LINEAGE_NODES) {
      throw new RangeError(`Lineage tree node count exceeds safe ceiling ${String(MAX_SAFE_LINEAGE_NODES)}`);
    }

    const child = node as { versions?: unknown; forks?: unknown };
    if (Array.isArray(child.versions)) {
      for (const v of child.versions) stack.push({ node: v, depth: depth + 1 });
    }
    if (Array.isArray(child.forks)) {
      for (const f of child.forks) stack.push({ node: f, depth: depth + 1 });
    }
  }
}

/**
 * Get the lineage graph for a definition: versions and forks as a tree.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param options - Optional client-side depth ceiling (see {@link GetLineageOptions})
 * @returns Lineage graph with version nodes and fork edges
 * @throws {RangeError} If the server response nests deeper than the safe ceiling (CWE-674 guard)
 * @throws {ResponseValidationError} If the response shape doesn't match `LineageResult`
 */
export async function getLineage(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  options?: GetLineageOptions,
): Promise<LineageResult> {
  const effectiveMax = options?.maxDepth != null
    ? Math.max(1, Math.min(options.maxDepth, MAX_SAFE_LINEAGE_DEPTH))
    : MAX_SAFE_LINEAGE_DEPTH;

  const raw = await http.get<unknown>(`${analyticsPath(type, name)}/lineage`, undefined);
  // Pre-parse depth/breadth guard before the recursive z.lazy() parse runs.
  assertLineageWithinBounds(raw, effectiveMax);
  return parseResponse(lineageResultSchema, raw, 'analytics.getLineage');
}

// ── Evolution ─────────────────────────────────────────────────────

/**
 * Get version-over-version metrics with trend detection.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @returns Evolution timeline with per-version metrics and trend indicators
 */
export async function getEvolution(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
): Promise<EvolutionResult> {
  return parseResponse(evolutionResultSchema, await http.get<EvolutionResult>(
    `${analyticsPath(type, name)}/evolution`,
    undefined,
  ), 'analytics.getEvolution');
}

// ── Translation Analytics ─────────────────────────────────────────

/**
 * Get versions grouped by translator version with aggregate metrics.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @returns Translation analytics grouped by translator version
 */
export async function getTranslation(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
): Promise<TranslationAnalyticsResult> {
  return parseResponse(translationAnalyticsResultSchema, await http.get<TranslationAnalyticsResult>(
    `${analyticsPath(type, name)}/translation`,
    undefined,
  ), 'analytics.getTranslation');
}

// ── Compare ───────────────────────────────────────────────────────

/**
 * Compare effectiveness across 2-5 definition versions side-by-side.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param versions - Array of 2-5 semver versions to compare
 * @returns Side-by-side effectiveness comparison with deltas
 * @throws {ValidationError} If fewer than 2 or more than 5 versions are supplied, or if any version is not valid semver
 */
export async function compare(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  versions: string[],
): Promise<CompareResult> {
  if (versions.length < 2 || versions.length > 5) {
    throw new ValidationError(`compare() requires 2-5 versions (received ${String(versions.length)})`, { field: 'versions', value: versions.length });
  }
  for (const v of versions) validateVersion(v);
  return parseResponse(compareResultSchema, await http.get<CompareResult>(
    `${analyticsPath(type, name)}/effectiveness/compare`,
    { versions: versions.join(',') },
  ), 'analytics.compare');
}

// ── Diff Impact ───────────────────────────────────────────────────

/**
 * Get structural diff combined with metric deltas between two versions.
 * Deltas are observational, not causal — caveats are always included.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param fromVersion - Source version
 * @param toVersion - Target version
 * @returns Structural diff with correlated metric changes and caveats
 */
export async function getDiffImpact(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  fromVersion: string,
  toVersion: string,
): Promise<DiffImpactResult> {
  validateVersion(fromVersion);
  validateVersion(toVersion);
  return parseResponse(diffImpactResultSchema, await http.get<DiffImpactResult>(
    `${analyticsPath(type, name)}/diff/${fromVersion}/${toVersion}/impact`,
    undefined,
  ), 'analytics.getDiffImpact');
}
