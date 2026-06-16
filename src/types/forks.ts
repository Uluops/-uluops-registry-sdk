/**
 * Fork-related types for the Registry SDK
 */

import type { Definition } from './definitions.js';
import type { Visibility } from './enums.js';

/**
 * Fork relationship record — mirrors the DB fork record returned by the API.
 *
 * @remarks Field names align with `forks` table columns:
 * - `definitionId` is the derived (forked) definition's id
 * - `sourceDefinitionId` is the parent's id; null when the source was deleted (SET NULL on delete)
 * - `sourceType`/`sourceName`/`sourceVersion` are the durable source-identity snapshot
 *   (API ≥ V1 2026-06-16); they survive source deletion, so the origin is readable even
 *   when `sourceDefinitionId` is null. Optional/null for older APIs or pre-snapshot rows.
 * - `forkedAt` is the creation timestamp
 */
export interface Fork {
  id: string;
  definitionId: string;
  sourceDefinitionId: string | null;
  sourceType?: string | null;
  sourceName?: string | null;
  sourceVersion?: string | null;
  forkedAt: string;
}

/**
 * Slim summary of a forked or source definition, returned by fork-related endpoints
 * (POST /fork, GET /lineage, GET /forks). Intentionally narrower than DefinitionListItem
 * — fork responses do not need full list-item enrichment.
 */
export interface ForkSummary {
  id: string;
  type: string;
  name: string;
  version: string;
  authorId: string;
  orgId: string | null;
}

/**
 * Request body for forking a definition
 */
export interface ForkDefinitionBody {
  name: string;
  visibility?: Visibility;
  displayName?: string;
  description?: string;
  targetOrgSlug?: string;
}

/**
 * Response from creating a fork
 */
export interface ForkResponse {
  definition: Definition;
  fork: Fork;
  source: ForkSummary;
  warnings?: string[];
}

/**
 * Forkability check response
 */
export interface ForkableCheck {
  canFork: boolean;
  reason?: string;
  requiresSubscription?: boolean;
}

/**
 * Fork lineage response — returned by GET /definitions/{type}/{name}@{version}/lineage.
 *
 * @remarks Shape reflects the API contract: a definition either is or isn't a fork.
 * - `isFork`: true if this definition was forked from another
 * - `fork`: the fork record (null if not a fork)
 * - `source`: slim summary of the LIVE source definition (null if not a fork or source was deleted)
 * - `sourceAvailable`: true when the live source still exists (API ≥ V1 2026-06-16). When
 *   false but `isFork` is true, the origin is still readable from `fork.source*` (durable
 *   snapshot). Optional — absent from APIs older than 2026-06-16.
 */
export interface ForkLineage {
  isFork: boolean;
  fork: Fork | null;
  source: ForkSummary | null;
  sourceAvailable?: boolean;
}

/**
 * Options for forkability check
 */
export interface CheckForkableOptions {
  canForkAsPrivate?: boolean;
}
