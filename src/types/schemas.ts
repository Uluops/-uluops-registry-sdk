/**
 * Zod validation schemas for the Registry SDK
 */

import { z } from 'zod';
import {
  AGENT_TYPES,
  CHANGE_TYPES,
  DEFINITION_STATUSES,
  DEFINITION_TYPES,
  DOMAINS,
  MODEL_STATUSES,
  MODEL_TIERS,
  SORT_FIELDS,
  SORT_ORDERS,
  TIERS,
  VISIBILITIES,
} from './enums.js';

// ============================================================================
// Enum schemas
// ============================================================================

export const definitionTypeSchema = z.enum(DEFINITION_TYPES);
export const definitionStatusSchema = z.enum(DEFINITION_STATUSES);
export const domainSchema = z.enum(DOMAINS);
export const agentTypeSchema = z.enum(AGENT_TYPES);
export const tierSchema = z.enum(TIERS);
export const visibilitySchema = z.enum(VISIBILITIES);
export const modelTierSchema = z.enum(MODEL_TIERS);
export const modelStatusSchema = z.enum(MODEL_STATUSES);
export const changeTypeSchema = z.enum(CHANGE_TYPES);
export const sortFieldSchema = z.enum(SORT_FIELDS);
export const sortOrderSchema = z.enum(SORT_ORDERS);

// ============================================================================
// Definition schemas
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

export const definitionListItemSchema = z.object({
  id: z.string().uuid(),
  type: definitionTypeSchema,
  name: z.string(),
  version: z.string(),
  status: definitionStatusSchema,
  displayName: z.string(),
  description: z.string(),
  domain: domainSchema,
  agentType: agentTypeSchema.nullish(),
  ownerId: z.string(),
  tier: tierSchema,
  visibility: visibilitySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullish(),
  executionCount: z.number().int().nonnegative(),
  forkCount: z.number().int().nonnegative(),
  starCount: z.number().int().nonnegative(),
});

export const listDefinitionsQuerySchema = z.object({
  type: definitionTypeSchema.optional(),
  status: definitionStatusSchema.optional(),
  agentType: agentTypeSchema.optional(),
  domain: domainSchema.optional(),
  tier: tierSchema.optional(),
  visibility: visibilitySchema.optional(),
  ownerId: z.string().optional(),
  search: z.string().max(100).optional(),
  tag: z.union([z.string(), z.array(z.string())]).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().nonnegative().optional(),
  sortBy: sortFieldSchema.optional(),
  sortOrder: sortOrderSchema.optional(),
});

export const createDefinitionBodySchema = z.object({
  yaml: z.string().max(102400), // 100KB
  visibility: visibilitySchema.optional(),
});

export const updateDefinitionBodySchema = z.object({
  yaml: z.string().max(102400).optional(),
  visibility: visibilitySchema.optional(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  domain: domainSchema.optional(),
  subdomain: z.string().optional(),
  agentType: agentTypeSchema.optional(),
  tags: z.array(z.string()).max(10).optional(),
  changeSummary: z.string().max(500).optional(),
  changeType: changeTypeSchema.optional(),
});

export const deprecateDefinitionBodySchema = z.object({
  reason: z.string().max(500),
  successor: z.string().optional(),
});

// ============================================================================
// Version schemas
// ============================================================================

export const versionListItemSchema = z.object({
  version: z.string(),
  status: definitionStatusSchema,
  createdAt: z.string(),
  publishedAt: z.string().nullish(),
  deprecatedAt: z.string().nullish(),
  changeType: changeTypeSchema.nullish(),
  changeSummary: z.string().nullish(),
});

// ============================================================================
// Fork schemas
// ============================================================================

export const forkSchema = z.object({
  id: z.string().uuid(),
  sourceDefinitionId: z.string().uuid(),
  derivedDefinitionId: z.string().uuid(),
  sourceVersion: z.string(),
  createdAt: z.string(),
});

export const forkDefinitionBodySchema = z.object({
  name: z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/),
  visibility: visibilitySchema.optional(),
  displayName: z.string().optional(),
  description: z.string().optional(),
});

export const forkableCheckSchema = z.object({
  canFork: z.boolean(),
  reason: z.string().optional(),
  requiresSubscription: z.boolean().optional(),
});

// ============================================================================
// Model schemas
// ============================================================================

export const modelCapabilitiesSchema = z.object({
  vision: z.boolean(),
  tools: z.boolean(),
  streaming: z.boolean(),
  extendedThinking: z.boolean(),
});

export const modelSchema = z.object({
  provider: z.string(),
  modelId: z.string(),
  displayName: z.string(),
  description: z.string(),
  providerModelId: z.string(),
  capabilities: modelCapabilitiesSchema,
  tier: modelTierSchema,
  status: modelStatusSchema,
  regions: z.array(z.string()).nullish(),
  releaseDate: z.string().nullish(),
  deprecationDate: z.string().nullish(),
  successor: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const modelAliasSchema = z.object({
  alias: z.string(),
  targetProvider: z.string(),
  targetModelId: z.string(),
  scope: z.enum(['global', 'user', 'team']),
  deprecated: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listModelsQuerySchema = z.object({
  provider: z.string().optional(),
  tier: modelTierSchema.optional(),
  status: modelStatusSchema.optional(),
  capability: z.enum(['vision', 'tools', 'streaming', 'extendedThinking']).optional(),
});

// ============================================================================
// User schemas
// ============================================================================

export const publicUserSchema = z.object({
  id: z.string().uuid(),
  username: z.string().nullish(),
  name: z.string().nullish(),
  bio: z.string().nullish(),
  websiteUrl: z.string().nullish(),
  avatar: z.string().nullish(),
  avatarMimeType: z.string().nullish(),
});

// ============================================================================
// Response schemas
// ============================================================================

export const validationResultSchema = z.object({
  valid: z.boolean(),
  errors: z
    .array(
      z.object({
        path: z.string(),
        message: z.string(),
        code: z.string().optional(),
      })
    )
    .optional(),
});

export const renderResultSchema = z.object({
  markdown: z.string(),
  variables: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const executionStatsSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  recentCount: z.number().int().nonnegative(),
  windowMinutes: z.number().int().positive(),
});

export const recordExecutionBodySchema = z.object({
  source: z.string().max(32),
  runId: z.string().optional(),
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

export const translatorVersionSchema = z.object({
  version: z.string(),
  releaseDate: z.string().optional(),
  schema: z.string().optional(),
});

// ============================================================================
// API Error schema
// ============================================================================

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    details: z.record(z.unknown()).optional(),
  }),
});
