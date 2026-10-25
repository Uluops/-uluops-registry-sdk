/**
 * Zod validation schemas for the Registry SDK
 */

import { z } from 'zod';
import {
  AGENT_TYPES,
  DEFINITION_STATUSES,
  DEFINITION_TYPES,
  DOMAINS,
  SUBSCRIPTION_TIERS,
  TIERS,
  VISIBILITIES,
} from './enums.js';

// ============================================================================
// Internal enum schemas (used by definitionSchema)
// ============================================================================

const definitionTypeSchema = z.enum(DEFINITION_TYPES);
const definitionStatusSchema = z.enum(DEFINITION_STATUSES);
const domainSchema = z.enum(DOMAINS);
const agentTypeSchema = z.enum(AGENT_TYPES);
const tierSchema = z.enum(TIERS);
const subscriptionTierSchema = z.enum(SUBSCRIPTION_TIERS);
const visibilitySchema = z.enum(VISIBILITIES);

// ============================================================================
// Definition schema
// ============================================================================

/**
 * The closure qualifier of a render (registry-api ADL v1.20 P0c; S1 B-D8, RG-1): the closure mode
 * it ran under, how many diagnostics that mode demoted from an error, and which legacy stamp it
 * carries. Served as `closure` on `/render` (the re-render), on preview (the publish verdict's
 * translation render, not the draft markdown) and on every definition read (the row's STORED live
 * render, `null` before P0c).
 *
 * `mode` and `legacyWording` are factory-owned vocabularies a factory release may extend, so they
 * are validated as strings, not enums (S1 C27, V50): a closed enum would make every read throw the
 * day the server sends a value this pin does not know. Known values live on the public types.
 */
export const renderClosureSchema = z.object({
  mode: z.string(),
  demoted: z.number().int(),
  legacyWording: z.string().nullable(),
});

/**
 * Authorship provenance — who contributed to a definition (or a specific
 * version of one) and in what role. Shared by the definition schema and the
 * versions-list response (per-version authorship).
 */
export const provenanceSchema = z.object({
  authorshipType: z.enum(['human', 'agent', 'collaborative', 'automated']),
  contributors: z.array(z.object({
    id: z.string(),
    role: z.enum(['author', 'optimizer', 'reviewer', 'editor', 'publisher']),
    type: z.enum(['human', 'agent']),
    name: z.string().optional(),
    agentName: z.string().optional(),
    contributedAt: z.string().optional(),
  })),
  dialecticRounds: z.number().int().nonnegative().optional(),
  optimizationRunId: z.string().optional(),
});

export const definitionSchema = z.object({
  id: z.guid(),
  type: definitionTypeSchema,
  name: z.string(),
  version: z.string(),
  status: definitionStatusSchema,
  yaml: z.string().nullish(),
  hash: z.string(),
  displayName: z.string(),
  description: z.string(),
  domain: domainSchema,
  subdomain: z.string().nullish(),
  agentType: agentTypeSchema.nullish(),
  author: z.string().nullish(),
  provenance: provenanceSchema.nullish(),
  tags: z.array(z.string()).nullish(),
  authorId: z.string(),
  orgId: z.string().nullish(),
  namespace: z.string().nullish(),
  tier: tierSchema,
  minSubscription: subscriptionTierSchema.nullish(),
  proRestricted: z.boolean().optional(),
  visibility: visibilitySchema,
  runtimeMd: z.string().nullish(),
  promptHash: z.string().nullish(),
  translatorVersion: z.string().nullish(),
  schemaVersion: z.string().nullish(),
  normalized: z.record(z.string(), z.unknown()).nullable().optional(),
  normalizationError: z.string().optional(),
  executionCount: z.number().int().nonnegative(),
  uniqueExecutionCount: z.number().int().nonnegative(),
  forkCount: z.number().int().nonnegative(),
  starCount: z.number().int().nonnegative(),
  forkedFromId: z.guid().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullish(),
  deprecatedAt: z.string().nullish(),
  riskProfile: z.object({
    sync: z.object({
      version: z.string(),
      scannedAt: z.string(),
      capabilities: z.object({
        tools: z.array(z.string()),
        preflightCommands: z.number().int().nonnegative(),
        maxTokens: z.number().optional(),
        temperature: z.number().optional(),
        agentType: z.string().optional(),
      }),
      signals: z.array(z.object({
        id: z.string(),
        severity: z.enum(['medium', 'high']),
        title: z.string(),
        detail: z.string(),
        location: z.string().optional(),
      })),
      riskLevel: z.enum(['none', 'medium', 'high']),
    }),
    deep: z.object({
      version: z.string(),
      analyzedAt: z.string(),
      findings: z.array(z.object({
        id: z.string(),
        severity: z.enum(['medium', 'high']),
        confidence: z.number(),
        title: z.string(),
        detail: z.string(),
        category: z.enum(['injection', 'exfiltration', 'escalation', 'resource', 'dependency', 'behavioral']),
        location: z.string().optional(),
      })),
      riskLevel: z.enum(['none', 'medium', 'high']),
      // Deep-analysis outcome — 'error' means the verdict could not be determined
      // (empty findings / 'none' riskLevel are sentinels, not a clean judgment).
      status: z.enum(['analyzed', 'error']).optional(),
      // Server-owned vocabulary that grows (unrepresentable_findings,
      // 2026-08-18). A closed enum here was the ADR-013 activation blocker:
      // parseResponse threw on every read of an affected definition the day
      // the server emitted a reason this pin didn't know. Validate shape,
      // not membership — the known values live on DeepAnalysisErrorReason.
      errorReason: z.string().optional(),
      // Must mirror DeepAnalysisResult.droppedFindings — Zod default-strips
      // unknown keys, so omitting a field here silently deletes it from
      // every SDK read (the second ADR-013 activation prerequisite).
      droppedFindings: z
        .object({
          total: z.number().int().nonnegative(),
          invalidCategory: z.number().int().nonnegative(),
          invalidSeverity: z.number().int().nonnegative(),
          malformed: z.number().int().nonnegative(),
        })
        .optional(),
    }).nullable(),
    aggregateRiskLevel: z.enum(['none', 'medium', 'high']),
    lastUpdated: z.string(),
    // Sync scan outcome — 'failed' means aggregateRiskLevel 'none' is a sentinel,
    // not a "clean" verdict (see isVerdictTrustworthy).
    scanStatus: z.enum(['complete', 'failed']).optional(),
    scanFailedReason: z.enum(['parse_error', 'timeout', 'internal']).optional(),
  }).nullish(),
  /** The live render's closure qualifier (registry-api ADL v1.20 P0c); `null` before P0c. */
  closure: renderClosureSchema.nullable().optional(),
});

// ============================================================================
// Execution schemas
// ============================================================================

export const executionStatsSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  recentCount: z.number().int().nonnegative(),
  windowMinutes: z.number().int().positive(),
});

export const starResultSchema = z.object({
  starred: z.boolean(),
  starCount: z.number().int().nonnegative(),
});

export const recordExecutionResultSchema = z.object({
  recorded: z.boolean(),
  duplicate: z.boolean(),
  definition: z.object({
    id: z.guid(),
    type: z.string(),
    name: z.string(),
    version: z.string(),
  }),
  executionCount: z.number().int().nonnegative(),
});
