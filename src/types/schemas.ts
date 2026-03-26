/**
 * Zod validation schemas for the Registry SDK
 */

import { z } from 'zod';
import {
  AGENT_TYPES,
  DEFINITION_STATUSES,
  DEFINITION_TYPES,
  DOMAINS,
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
const visibilitySchema = z.enum(VISIBILITIES);

// ============================================================================
// Definition schema
// ============================================================================

export const definitionSchema = z.object({
  id: z.string().uuid(),
  type: definitionTypeSchema,
  name: z.string(),
  version: z.string(),
  status: definitionStatusSchema,
  yaml: z.string(),
  hash: z.string(),
  displayName: z.string(),
  description: z.string(),
  domain: domainSchema,
  subdomain: z.string().nullish(),
  agentType: agentTypeSchema.nullish(),
  author: z.string().nullish(),
  tags: z.array(z.string()).nullish(),
  ownerId: z.string(),
  authorId: z.string().optional(),
  orgId: z.string().nullish(),
  namespace: z.string().nullish(),
  tier: tierSchema,
  visibility: visibilitySchema,
  runtimeMd: z.string().nullish(),
  translatorVersion: z.string().nullish(),
  schemaVersion: z.string().nullish(),
  executionCount: z.number().int().nonnegative(),
  forkCount: z.number().int().nonnegative(),
  starCount: z.number().int().nonnegative(),
  forkedFromId: z.string().uuid().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullish(),
  deprecatedAt: z.string().nullish(),
});

// ============================================================================
// Execution schemas
// ============================================================================

export const executionStatsSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  recentCount: z.number().int().nonnegative(),
  windowMinutes: z.number().int().positive(),
});

export const recordExecutionResultSchema = z.object({
  recorded: z.boolean(),
  duplicate: z.boolean(),
  definition: z.object({
    id: z.string().uuid(),
    type: z.string(),
    name: z.string(),
    version: z.string(),
  }),
  executionCount: z.number().int().nonnegative(),
});
