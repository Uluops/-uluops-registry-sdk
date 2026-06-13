/**
 * Zod Response Validation Schemas
 *
 * Runtime validation for API responses. All schemas validate the inner
 * payload after the HttpClient auto-unwraps the { data: T } envelope.
 *
 * ## Design Decision: Strict Schema Coupling (ADR-002)
 *
 * This SDK intentionally couples response schemas tightly to the API contract.
 * If the API removes a required field or changes a type, operations throw
 * `ResponseValidationError` rather than returning silently corrupted data.
 *
 * This is a deliberate trade-off:
 * - **Chosen**: Fail-fast on contract drift. Consumers get clear errors.
 * - **Rejected**: Lenient/partial parsing (graceful degradation). Would let
 *   consumers operate on incomplete data without realizing the contract broke.
 * - **Mitigated by**: Default `.strip()` behavior — new fields added by the
 *   API are silently dropped, so additive API changes never cause failures.
 *   Only breaking changes (removed/retyped fields) trigger validation errors.
 * - **Operational constraint**: SDK and API versions should advance together.
 *   While pre-1.0, breaking changes may occur in minor releases. Post-1.0,
 *   this will be enforced by semver (API breaking changes require a major bump).
 *
 * See: ADR-002-strict-response-validation.md
 *
 * ## Conventions (matching ops-sdk):
 * - .nullable() = DB allows NULL, field always present
 * - .optional() = API sometimes omits the field
 * - .nullable().optional() = nullable when present, sometimes omitted
 * - No .nullish() in response schemas (API never sends undefined)
 * - Default .strip() behavior (unknown fields silently dropped)
 */

import { z } from 'zod';
import {
  DEFINITION_TYPES,
  DEFINITION_STATUSES,
  DOMAINS,
  AGENT_TYPES,
  TIERS,
  SUBSCRIPTION_TIERS,
  VISIBILITIES,
  MODEL_TIERS,
  MODEL_STATUSES,
  CHANGE_TYPES,
} from './enums.js';
import type { DefinitionType } from './enums.js';
import { definitionSchema } from './schemas.js';

// ============================================================================
// Shared Primitives
// ============================================================================

/** Accepts ISO 8601 with offset or bare YYYY-MM-DD date strings. */
export const DateTimeStringSchema = z.string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));

export const NullableDateTimeSchema = DateTimeStringSchema.nullable();

// Enum schemas for response validation
const definitionTypeResponseSchema = z.enum(DEFINITION_TYPES);
const definitionStatusResponseSchema = z.enum(DEFINITION_STATUSES);
const domainResponseSchema = z.enum(DOMAINS);
const agentTypeResponseSchema = z.enum(AGENT_TYPES);
const tierResponseSchema = z.enum(TIERS);
const subscriptionTierResponseSchema = z.enum(SUBSCRIPTION_TIERS);
const visibilityResponseSchema = z.enum(VISIBILITIES);
const modelTierResponseSchema = z.enum(MODEL_TIERS);
const modelStatusResponseSchema = z.enum(MODEL_STATUSES);
const changeTypeResponseSchema = z.enum(CHANGE_TYPES);

// ============================================================================
// Phase 1: Simple Response Schemas
// ============================================================================

/** Validation error detail */
const validationErrorSchema = z.object({
  path: z.string(),
  message: z.string(),
  code: z.string().optional(),
});

/** POST /validate/{type} */
export const validationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(validationErrorSchema).optional(),
});

/** Target adapter warning */
const targetWarningSchema = z.object({
  field: z.string(),
  reason: z.string(),
  level: z.enum(['info', 'warn', 'error']),
});

/** GET /definitions/{type}/{name}/{version}/render, POST /render/{type}/preview */
export const renderResultSchema = z.object({
  markdown: z.string(),
  promptHash: z.string().nullable().optional(),
  variables: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  target: z.string().optional(),
  warnings: z.array(targetWarningSchema).optional(),
});

/** Non-fatal warning emitted during a publish operation. */
export const publishWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /definitions/{type}/{name}/{version}/publish response envelope.
 *
 * `warnings` is omitted from the wire when empty (preserves the pre-0.49.3
 * contract for the happy path) — the SDK normalizes that into an empty array
 * so consumers always see a stable shape.
 */
export const publishResponseSchema = z.object({
  data: definitionSchema,
  warnings: z.array(publishWarningSchema).optional(),
});

/** GET /definitions/translation/version */
export const translatorVersionSchema = z.object({
  translatorVersion: z.string(),
  releaseDate: z.string().optional(),
  schema: z.string().optional(),
});

/**
 * POST /definitions/:type/:name/retranslate
 *
 * The API returns a narrow retranslation summary, NOT a full Definition.
 * Earlier versions of this SDK parsed the response with `definitionSchema`,
 * which raised ZodError on every retranslate call because the actual payload
 * lacks id/status/hash/displayName/... Surfaced by live MCP smoke test
 * on 2026-06-01.
 */
export const retranslateResultSchema = z.object({
  type: z.string(),
  name: z.string(),
  version: z.string(),
  translatorVersion: z.string(),
  previousTranslatorVersion: z.string().nullable().optional(),
  changes: z.unknown().optional(),
});

/** GET /definitions/{type}/{name}/{version}/forkable */
export const forkableCheckSchema = z.object({
  canFork: z.boolean(),
  reason: z.string().optional(),
  requiresSubscription: z.boolean().optional(),
});

/** GET /users/{id} */
export const publicUserSchema = z.object({
  id: z.string(),
  username: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  avatarMimeType: z.string().nullable().optional(),
});

/** POST /models/sync */
export const modelSyncResultSchema = z.object({
  message: z.string().optional(),
  providersAdded: z.number().int().nonnegative(),
  providersUpdated: z.number().int().nonnegative(),
  modelsAdded: z.number().int().nonnegative(),
  modelsUpdated: z.number().int().nonnegative(),
  duration: z.union([z.string(), z.number()]).optional(),
});

/** Provider entity */
export const providerSchema = z.object({
  id: z.string(),
  name: z.string(),
  logoUrl: z.string().optional(),
  docUrl: z.string().optional(),
  apiUrl: z.string().optional(),
  status: z.enum(['active', 'inactive', 'deprecated']),
});

/** GET /models/providers */
export const providersListResponseSchema = z.object({
  providers: z.array(providerSchema),
  total: z.number().int().nonnegative(),
});

// ============================================================================
// Phase 2: List & Composite Response Schemas
// ============================================================================

/** Lightweight definition for list responses */
export const definitionListItemSchema = z.object({
  id: z.string().uuid(),
  type: definitionTypeResponseSchema,
  name: z.string(),
  version: z.string(),
  status: definitionStatusResponseSchema,
  displayName: z.string(),
  description: z.string(),
  domain: domainResponseSchema,
  agentType: agentTypeResponseSchema.nullable().optional(),
  authorId: z.string(),
  orgId: z.string().nullable().optional(),
  tier: tierResponseSchema,
  minSubscription: subscriptionTierResponseSchema.nullable().optional(),
  proRestricted: z.boolean().optional(),
  visibility: visibilityResponseSchema,
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
  publishedAt: NullableDateTimeSchema.optional(),
  executionCount: z.number().int().nonnegative(),
  forkCount: z.number().int().nonnegative(),
  starCount: z.number().int().nonnegative(),
  authorshipType: z.enum(['human', 'agent', 'collaborative', 'automated']).nullable().optional(),
});

/** GET /definitions */
export const definitionListResponseSchema = z.object({
  definitions: z.array(definitionListItemSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  hasMore: z.boolean().optional(),
});

/** Version list item */
export const versionListItemSchema = z.object({
  id: z.string().uuid(),
  version: z.string(),
  hash: z.string(),
  promptHash: z.string().nullable().optional(),
  createdAt: DateTimeStringSchema,
  createdBy: z.string(),
  changeType: changeTypeResponseSchema.nullable().optional(),
  changeSummary: z.string().nullable().optional(),
});

/** GET /definitions/{type}/{name}/versions */
export const versionsListResponseSchema = z.object({
  versions: z.array(versionListItemSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

/** Model capabilities — all fields optional for upstream-synced models */
export const modelCapabilitiesSchema = z.object({
  vision: z.boolean().optional(),
  tools: z.boolean().optional(),
  streaming: z.boolean().optional(),
  extendedThinking: z.boolean().optional(),
  structuredOutput: z.boolean().optional(),
});

/** Model entity — many fields optional for upstream-synced models */
export const modelSchema = z.object({
  provider: z.string(),
  modelId: z.string(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  providerModelId: z.string().optional(),
  capabilities: modelCapabilitiesSchema,
  limits: z.object({ context: z.number(), output: z.number() }).optional(),
  tier: modelTierResponseSchema,
  status: modelStatusResponseSchema,
  regions: z.array(z.string()).nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  deprecationDate: z.string().nullable().optional(),
  successor: z.string().nullable().optional(),
  createdAt: DateTimeStringSchema.optional(),
  updatedAt: DateTimeStringSchema.optional(),
});

/** Model alias */
export const modelAliasSchema = z.object({
  alias: z.string(),
  provider: z.string(),
  modelId: z.string(),
  description: z.string().optional(),
  scope: z.enum(['global', 'user', 'team']).optional(),
  deprecated: z.boolean().optional(),
  createdAt: DateTimeStringSchema.optional(),
  updatedAt: DateTimeStringSchema.optional(),
});

/** GET /models */
export const modelsListResponseSchema = z.object({
  models: z.array(modelSchema),
  aliases: z.array(modelAliasSchema),
  total: z.number().int().nonnegative(),
});

/** GET /models/aliases */
export const aliasesListResponseSchema = z.object({
  aliases: z.array(modelAliasSchema),
  total: z.number().int().nonnegative(),
});

/** GET /models/resolve/{alias} */
export const aliasResolutionSchema = z.object({
  alias: z.string(),
  target: z.string(),
  model: modelSchema.nullable().optional(),
});

/**
 * Fork record schema — matches the DB fork record shape returned by the API.
 * Used by fork creation, list-forks, and lineage responses.
 */
export const forkSchema = z.object({
  id: z.string().uuid(),
  definitionId: z.string().uuid(),
  sourceDefinitionId: z.string().uuid().nullable(),
  forkedAt: z.string(),
});

/**
 * Slim summary of a forked or source definition.
 * The API intentionally returns a 6-field summary on fork endpoints rather than
 * the full DefinitionListItem — this schema mirrors that contract.
 */
export const forkSummarySchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  name: z.string(),
  version: z.string(),
  authorId: z.string().uuid(),
  orgId: z.string().nullable(),
});

/** POST /definitions/{type}/{name}/{version}/fork */
export const forkResponseSchema = z.object({
  definition: definitionSchema,
  fork: forkSchema,
  source: forkSummarySchema,
  warnings: z.array(z.string()).optional(),
});

/** GET /definitions/{type}/{name}/{version}/lineage (forks) */
export const forkLineageSchema = z.object({
  isFork: z.boolean(),
  fork: forkSchema.nullable(),
  source: forkSummarySchema.nullable(),
});

/** GET /definitions/{type}/{name}/{version}/forks */
export const forkListResponseSchema = z.object({
  forks: z.array(z.object({
    fork: forkSchema,
    definition: forkSummarySchema.nullable(),
  })),
  totalForks: z.number().int().nonnegative(),
});

// ─────────────────────────────────────────────────────────────────
// Dependency graph schemas (live-tests T2 §3.5 — R12)
//
// Before R12: a single `dependencyGraphSchema` with optional nodes/edges/
// cycleDetected/cycles fields that bore no relation to the API response.
// Server returned `{ definition, graph: DependencyNode, flat, totalCount,
// maxDepth }` for deps and `{ definition, dependents, totalCount }` for
// dependents — both got parsed as `{}` because every field was optional.
// Callers received a degenerate object the type system happily accepted.
//
// After R12: two distinct envelope schemas matching the actual API shape,
// with a recursive node schema for the nested dependency tree.
// ─────────────────────────────────────────────────────────────────

// Defensive string-length ceilings on dependency graph fields (post-impl r2,
// CWE-20). The registry-api server-side DB column sizes:
//   definitions.name      VARCHAR(100)
//   definition_versions.semver VARCHAR(20)
// `context` is a free-form ref-context label ("invokes.agent", "phase validate",
// "dependencies.requires") with no enforced server limit — bound it
// generously here so a malicious server can't blow up consumer memory.
// A compliant server is never affected; oversized payloads convert from
// silent memory pressure into a loud ZodError at parse time.
const MAX_DEFINITION_NAME = 100;
const MAX_DEFINITION_VERSION = 20;
const MAX_CONTEXT_LABEL = 255;

/**
 * Recursive shape for the dependency graph node. Local to the schema module —
 * the public type alias lives in types/dependencies.ts (as `DependencyNode`)
 * and is exported there.
 *
 * NOTE: `DependencyNodeShape` and the `z.object({...})` body inside the
 * `z.lazy()` below MUST stay in sync. The `z.ZodType<DependencyNodeShape>`
 * annotation on the schema export catches *missing* fields in the z.object
 * at compile time (the bound forces the schema's output type to match).
 * But adding a field to `DependencyNodeShape` without updating the inner
 * z.object will not error — strip-mode would silently drop the field at
 * parse time. Same risk applies inversely: adding an OPTIONAL field to the
 * shape but not to the z.object compiles fine but silently drops. When
 * adding fields (required OR optional), edit BOTH places.
 */
type DependencyNodeShape = {
  id: string;
  type: DefinitionType;
  name: string;
  version: string;
  context?: string;
  dependencies: DependencyNodeShape[];
};

/**
 * A node in the dependency graph — recursively contains its own dependencies.
 * Mirrors `DependencyNode` in uluops-registry-api/services/dependency/index.ts.
 * See `DependencyNodeShape` above for the dual-definition sync note.
 */
export const dependencyNodeSchema: z.ZodType<DependencyNodeShape> = z.lazy(() =>
  z.object({
    id: z.string().uuid(),
    type: definitionTypeResponseSchema,
    name: z.string().max(MAX_DEFINITION_NAME),
    version: z.string().max(MAX_DEFINITION_VERSION),
    context: z.string().max(MAX_CONTEXT_LABEL).optional(),
    dependencies: z.array(dependencyNodeSchema),
  })
);

/** A flat row in the dependency graph's pre-flattened view. */
export const flatDepSchema = z.object({
  id: z.string().uuid(),
  type: definitionTypeResponseSchema,
  name: z.string().max(MAX_DEFINITION_NAME),
  version: z.string().max(MAX_DEFINITION_VERSION),
  depth: z.number().int().nonnegative(),
});

/**
 * A single dependent — a definition that references this one.
 * Mirrors `Dependent` in uluops-registry-api/services/dependency/index.ts.
 */
export const dependentSchema = z.object({
  id: z.string().uuid(),
  type: definitionTypeResponseSchema,
  name: z.string().max(MAX_DEFINITION_NAME),
  version: z.string().max(MAX_DEFINITION_VERSION),
  context: z.string().max(MAX_CONTEXT_LABEL),
});

/**
 * Strict {type, name, version} envelope header used by both dependency
 * response shapes. NOT to be confused with `definitionRefSchema` later in
 * this file — that one uses `z.string()` for type (no enum validation) and
 * has `version` optional, both intentional for analytics endpoints that
 * serve cross-version data. The dependency envelopes need the enum
 * constraint AND a required version.
 */
const dependencyEnvelopeDefinitionSchema = z.object({
  type: definitionTypeResponseSchema,
  name: z.string().max(MAX_DEFINITION_NAME),
  version: z.string().max(MAX_DEFINITION_VERSION),
});

/** Envelope returned by GET /definitions/{type}/{name}/{version}/dependents. */
export const dependentsResponseSchema = z.object({
  definition: dependencyEnvelopeDefinitionSchema,
  dependents: z.array(dependentSchema),
  totalCount: z.number().int().nonnegative(),
});

/** Envelope returned by GET /definitions/{type}/{name}/{version}/dependencies. */
export const dependencyGraphResponseSchema = z.object({
  definition: dependencyEnvelopeDefinitionSchema,
  graph: dependencyNodeSchema,
  flat: z.array(flatDepSchema),
  totalCount: z.number().int().nonnegative(),
  maxDepth: z.number().int().nonnegative(),
});

/** POST /definitions/{type}/{name}/upgrade */
export const upgradeResultSchema = z.object({
  definition: definitionSchema,
  version: z.string(),
  changes: z.record(z.string(), z.unknown()),
});

/** POST /users/batch */
export const batchUserResponseSchema = z.record(z.string(), publicUserSchema.nullable());

// ============================================================================
// Phase 3: Analytics Response Schemas
// ============================================================================

/** Failure domain distribution — shared across analytics types */
export const failureDomainDistributionSchema = z.object({
  STR: z.number(),
  SEM: z.number(),
  PRA: z.number(),
  EPI: z.number(),
});

/** Health factor — shared across effectiveness and health */
export const healthFactorSchema = z.object({
  factor: z.string(),
  score: z.number(),
  weight: z.number(),
  status: z.enum(['excellent', 'good', 'needs_attention', 'critical']),
  detail: z.string(),
  raw: z.object({
    value: z.number(),
    threshold: z.number(),
  }).optional(),
});

/** Definition reference — shared across analytics types. Version is optional for cross-version analytics. */
export const definitionRefSchema = z.object({
  type: z.string(),
  name: z.string(),
  version: z.string().optional(),
});

/** Effectiveness metrics */
const effectivenessMetricsSchema = z.object({
  passRate: z.number(),
  runAvgScore: z.number(),
  scoreStdDev: z.number().nullable(),
  issueYield: z.number(),
  falsePositiveRate: z.number(),
  resolutionRate: z.number(),
  regressionRate: z.number().nullable(),
  avgResolutionTimeHours: z.number().nullable(),
  failureDomainDistribution: failureDomainDistributionSchema,
  epistemicDensity: z.number(),
});

/** Constituent agent metrics for composition lift */
const constituentAgentMetricsSchema = z.object({
  type: z.string(),
  name: z.string(),
  independentAvgScore: z.number().nullable(),
  independentRunCount: z.number().int().nonnegative(),
});

/** Lift statistics */
const liftStatisticsSchema = z.object({
  standardError: z.number(),
  ci95: z.tuple([z.number(), z.number()]),
  significant: z.boolean(),
  sampleSizes: z.object({
    pipeline: z.number().int().nonnegative(),
    independent: z.number().int().nonnegative(),
  }),
});

/** Composition lift result */
const compositionLiftResultSchema = z.object({
  compositionLift: z.number().nullable(),
  pipelineAvgScore: z.number().nullable(),
  independentMeanScore: z.number().nullable(),
  constituentAgents: z.array(constituentAgentMetricsSchema),
  statistics: liftStatisticsSchema.nullable(),
  caveats: z.array(z.string()),
});

/** GET /analytics/definitions/{type}/{name}/effectiveness */
export const definitionEffectivenessSchema = z.object({
  definition: definitionRefSchema,
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
  metrics: z.object({
    executionCount: z.number().int().nonnegative(),
    uniqueProjects: z.number().int().nonnegative(),
    uniqueUsers: z.number().int().nonnegative(),
    effectiveness: effectivenessMetricsSchema.nullable(),
    healthScore: z.number().nullable(),
    factorCompleteness: z.number(),
    healthFactors: z.array(healthFactorSchema),
    compositionLift: compositionLiftResultSchema.nullable().optional(),
  }),
  stale: z.boolean(),
});

/** GET /analytics/definitions/{type}/{name}/health */
export const definitionHealthSchema = z.object({
  definition: definitionRefSchema,
  healthScore: z.number().nullable(),
  grade: z.string().nullable(),
  provisional: z.boolean(),
  caveats: z.array(z.string()),
  issueProfile: z.object({
    failureDomainDistribution: failureDomainDistributionSchema,
    epistemicDensity: z.number(),
    dominantDomain: z.string(),
    interpretation: z.string(),
  }).nullable(),
  factors: z.array(healthFactorSchema),
  stale: z.boolean(),
});

/** GET /analytics/ecosystem/overview */
export const ecosystemOverviewSchema = z.object({
  definitions: z.object({
    total: z.number().int().nonnegative(),
    // SAFETY: The API returns { agent: N, command: N, workflow: N, pipeline: N } but
    // z.record validates values only (not keys). The narrowing cast is safe because:
    // 1. Extra keys are harmless (Partial makes all optional)
    // 2. The API contract guarantees only these four definition types exist
    byType: z.record(z.string(), z.number()).transform(v => v as Partial<Record<'agent' | 'command' | 'workflow' | 'pipeline', number>>),
  }),
  execution: z.object({
    totalRuns: z.number().nullable(),
    uniqueProjects: z.number().nullable(),
  }),
  effectiveness: z.object({
    avgHealthScore: z.number().nullable(),
    ecosystemTaxonomy: z.object({
      totalIssues: z.number().int().nonnegative(),
      failureDomainDistribution: failureDomainDistributionSchema,
      avgEpistemicDensity: z.number(),
    }).nullable(),
    topPerformers: z.array(z.object({
      type: z.string(),
      name: z.string(),
      healthScore: z.number(),
      epistemicDensity: z.number(),
    })),
    needsAttention: z.array(z.object({
      type: z.string(),
      name: z.string(),
      healthScore: z.number(),
      reason: z.string(),
    })),
  }),
  stale: z.boolean(),
});

/** Lineage node — recursive via z.lazy() */
import type { LineageNode } from './analytics.js';

export const lineageNodeSchema: z.ZodType<LineageNode> = z.lazy(() => z.object({
  type: z.string(),
  name: z.string(),
  version: z.string(),
  authorId: z.string(),
  relationship: z.enum(['root', 'version', 'fork']),
  healthScore: z.number().nullable(),
  translatorVersion: z.string().nullable(),
  status: z.string(),
  createdAt: z.string().nullable(),
  versions: z.array(lineageNodeSchema),
  forks: z.array(lineageNodeSchema),
}));

/** Lineage statistics */
const lineageStatisticsSchema = z.object({
  totalExecutions: z.number().int().nonnegative(),
  activeVariants: z.number().int().nonnegative(),
  mostForked: z.object({
    name: z.string(),
    version: z.string(),
    forkCount: z.number().int().nonnegative(),
  }).nullable(),
  mostExecuted: z.object({
    name: z.string(),
    version: z.string(),
    executionCount: z.number().int().nonnegative(),
  }).nullable(),
  highestEffectiveness: z.object({
    name: z.string(),
    version: z.string(),
    healthScore: z.number(),
  }).nullable(),
});

/** GET /analytics/definitions/{type}/{name}/lineage */
export const lineageResultSchema = z.object({
  root: lineageNodeSchema,
  totalVersions: z.number().int().nonnegative(),
  totalForks: z.number().int().nonnegative(),
  statistics: lineageStatisticsSchema,
  stale: z.boolean(),
});

/** Evolution data point */
const evolutionPointSchema = z.object({
  version: z.string(),
  publishedAt: z.string().nullable(),
  translatorVersion: z.string().nullable(),
  changeSummary: z.string().nullable(),
  metrics: z.object({
    passRate: z.number(),
    runAvgScore: z.number().nullable(),
    runCount: z.number().int().nonnegative(),
    healthScore: z.number().nullable(),
  }).nullable(),
});

/** Overall trend */
const overallTrendSchema = z.object({
  trajectory: z.enum(['consistent_improvement', 'consistent_decline', 'stable', 'volatile', 'insufficient_data']),
  passRateChange: z.string().nullable(),
  runAvgScoreChange: z.string().nullable(),
  epistemicDensityChange: z.string().nullable(),
});

/** GET /analytics/definitions/{type}/{name}/evolution */
export const evolutionResultSchema = z.object({
  definition: definitionRefSchema,
  versions: z.array(evolutionPointSchema),
  trend: z.enum(['improving', 'declining', 'stable', 'insufficient_data']),
  trendConfidence: z.enum(['low', 'medium', 'high']).nullable(),
  overallTrend: overallTrendSchema,
  stale: z.boolean(),
});

/** Translator group metrics */
const translatorGroupMetricsSchema = z.object({
  translatorVersion: z.string(),
  isCurrent: z.boolean(),
  versions: z.array(z.string()),
  aggregateMetrics: z.object({
    totalRuns: z.number().int().nonnegative(),
    avgPassRate: z.number().nullable(),
    runAvgScore: z.number().nullable(),
  }),
});

/** Projected improvement */
const projectedImprovementSchema = z.object({
  passRateDelta: z.number(),
  runAvgScoreDelta: z.number(),
});

/** GET /analytics/definitions/{type}/{name}/translation */
export const translationAnalyticsResultSchema = z.object({
  definition: definitionRefSchema,
  currentTranslatorVersion: z.string(),
  groups: z.array(translatorGroupMetricsSchema),
  upgradeAvailable: z.boolean(),
  projectedImprovement: projectedImprovementSchema.nullable(),
  recommendation: z.string().nullable(),
  stale: z.boolean(),
});

/** Version comparison entry */
const versionComparisonEntrySchema = z.object({
  version: z.string(),
  passRate: z.number(),
  runAvgScore: z.number().nullable(),
  runCount: z.number().int().nonnegative(),
  healthScore: z.number().nullable(),
  translatorVersion: z.string().nullable(),
  failureDomainDistribution: failureDomainDistributionSchema.nullable(),
  epistemicDensity: z.number().nullable(),
});

/** GET /analytics/definitions/{type}/{name}/effectiveness/compare */
export const compareResultSchema = z.object({
  definition: definitionRefSchema,
  versions: z.array(versionComparisonEntrySchema),
  stale: z.boolean(),
});

/** Categorized change */
const categorizedChangeSchema = z.object({
  category: z.enum(['scoring', 'criteria', 'output', 'metadata', 'behavior', 'other']),
  section: z.string(),
  changeType: z.enum(['added', 'removed', 'modified']),
});

/** Taxonomy shift */
const taxonomyShiftSchema = z.object({
  from: failureDomainDistributionSchema,
  to: failureDomainDistributionSchema,
  delta: failureDomainDistributionSchema,
  epistemicDensityDelta: z.number(),
});

/** GET /analytics/definitions/{type}/{name}/diff/{from}/{to}/impact */
export const diffImpactResultSchema = z.object({
  definition: definitionRefSchema,
  diff: z.object({
    hasChanges: z.boolean(),
    sectionsAdded: z.array(z.string()),
    sectionsRemoved: z.array(z.string()),
    sectionsModified: z.array(z.string()),
    fromLineCount: z.number().int().nonnegative(),
    toLineCount: z.number().int().nonnegative(),
  }),
  from: z.object({
    version: z.string(),
    passRate: z.number(),
    runAvgScore: z.number().nullable(),
    runCount: z.number().int().nonnegative(),
  }),
  to: z.object({
    version: z.string(),
    passRate: z.number(),
    runAvgScore: z.number().nullable(),
    runCount: z.number().int().nonnegative(),
  }),
  deltas: z.object({
    passRateDelta: z.number().nullable(),
    runAvgScoreDelta: z.number().nullable(),
    runCountDelta: z.number().int(),
  }),
  categorizedChanges: z.array(categorizedChangeSchema),
  taxonomyShift: taxonomyShiftSchema.nullable(),
  caveats: z.array(z.string()),
  stale: z.boolean(),
});

// ============================================================================
// Phase 4: Version Diff Schemas
// ============================================================================

/** Shared base fields for all version diff shapes */
const versionDiffBaseSchema = z.object({
  fromVersion: z.string(),
  toVersion: z.string(),
  fromHash: z.string(),
  toHash: z.string(),
  hasChanges: z.boolean(),
  fromPromptHash: z.string().nullable(),
  toPromptHash: z.string().nullable(),
  hasPromptChanges: z.boolean(),
});

/** Full version diff (full=true) */
export const versionDiffSchema = versionDiffBaseSchema.extend({
  fromYaml: z.string(),
  toYaml: z.string(),
});

/** Summary version diff (default) */
export const versionDiffSummarySchema = versionDiffBaseSchema.extend({
  fromLineCount: z.number().int().nonnegative(),
  toLineCount: z.number().int().nonnegative(),
  sectionsAdded: z.array(z.string()),
  sectionsRemoved: z.array(z.string()),
  sectionsModified: z.array(z.string()),
  sectionsUnchanged: z.array(z.string()),
});

/** Field-level diff (format=fields) */
export const versionFieldDiffSchema = versionDiffBaseSchema.extend({
  fields: z.array(z.object({
    path: z.string(),
    type: z.enum(['added', 'removed', 'modified', 'moved']),
    fromPath: z.string().optional(),
    oldValue: z.unknown().optional(),
    newValue: z.unknown().optional(),
    valueDiff: z.array(z.tuple([z.number(), z.string()])).optional(),
    arrayChanges: z.array(z.object({
      index: z.number().int(),
      type: z.string(),
      oldValue: z.unknown().optional(),
      newValue: z.unknown().optional(),
      fromIndex: z.number().int().optional(),
    })).optional(),
  })),
  summary: z.object({
    added: z.number().int().nonnegative(),
    removed: z.number().int().nonnegative(),
    modified: z.number().int().nonnegative(),
    unchanged: z.number().int().nonnegative(),
  }),
  sections: z.object({
    added: z.array(z.string()),
    removed: z.array(z.string()),
    modified: z.array(z.string()),
    unchanged: z.array(z.string()),
  }),
  classified: z.array(z.object({
    path: z.string(),
    type: z.string(),
    significance: z.enum(['breaking', 'structural', 'cosmetic', 'metadata']),
    reason: z.string(),
    oldValue: z.unknown().optional(),
    newValue: z.unknown().optional(),
  })),
  suggestedBump: z.enum(['major', 'minor', 'patch']),
});

/** Unified line diff (format=unified) */
export const versionUnifiedDiffSchema = versionDiffBaseSchema.extend({
  unified: z.string(),
  fromLineCount: z.number().int().nonnegative(),
  toLineCount: z.number().int().nonnegative(),
});

// ============================================================================
// Languages
// ============================================================================

/** Language summary (list item). */
export const languageSummarySchema = z.object({
  id: z.string(),
  displayName: z.string(),
  abbreviation: z.string(),
  description: z.string(),
  definitionType: z.string(),
  currentVersion: z.string(),
  status: z.string(),
});

/** Embedded JSON Schema metadata. */
const languageSchemaContentSchema = z.object({
  version: z.string(),
  title: z.string(),
  schemaUrl: z.string(),
  content: z.record(z.string(), z.unknown()),
});

/** Language with current JSON Schema (get response). */
export const languageWithSchemaSchema = languageSummarySchema.extend({
  schema: languageSchemaContentSchema,
});

/** Languages list response. */
export const languagesListResponseSchema = z.object({
  languages: z.array(languageSummarySchema),
  total: z.number().int(),
});

