/**
 * Contract Test Helpers
 *
 * Mock data factories that produce schema-validated responses,
 * nock helpers that validate mock shapes at registration time,
 * and assertion utilities for contract testing.
 *
 * Pattern: ops-sdk contract-helpers.ts
 */

import { z } from 'zod';
import nock from 'nock';
import {
  // Phase 1
  validationResultSchema,
  renderResultSchema,
  translatorVersionSchema,
  forkableCheckSchema,
  publicUserSchema,
  modelSyncResultSchema,
  providerSchema,
  providersListResponseSchema,
  // Phase 2
  definitionListItemSchema,
  definitionListResponseSchema,
  versionListItemSchema,
  versionsListResponseSchema,
  modelCapabilitiesSchema,
  modelSchema,
  modelAliasSchema,
  modelsListResponseSchema,
  aliasesListResponseSchema,
  aliasResolutionSchema,
  forkSchema,
  forkResponseSchema,
  forkLineageSchema,
  forkListResponseSchema,
  dependencyNodeSchema,
  dependencyGraphResponseSchema,
  dependentsResponseSchema,
  dependentSchema,
  flatDepSchema,
  upgradeResultSchema,
  batchUserResponseSchema,
  // Phase 3
  failureDomainDistributionSchema,
  healthFactorSchema,
  definitionRefSchema,
  definitionEffectivenessSchema,
  definitionHealthSchema,
  ecosystemOverviewSchema,
  lineageResultSchema,
  lineageNodeSchema,
  evolutionResultSchema,
  translationAnalyticsResultSchema,
  compareResultSchema,
  diffImpactResultSchema,
  // Phase 4
  versionDiffSchema,
  versionDiffSummarySchema,
  versionFieldDiffSchema,
  versionUnifiedDiffSchema,
} from '../src/types/response-schemas.js';
import { definitionSchema } from '../src/types/schemas.js';

// ============================================================================
// Schema Envelope Factories (test-only)
// ============================================================================

/** Wrap a schema in { data: T, message? } envelope for test validation */
function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    message: z.string().optional(),
  });
}

/** Wrap an item schema in { data: T[], count? } for list test validation */
function createListResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    count: z.number().int().nonnegative().optional(),
  });
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * When true, mock factories validate their output against the schema.
 * Set STRICT_CONTRACTS=false to disable (useful for debugging).
 */
const STRICT_CONTRACTS = process.env.STRICT_CONTRACTS !== 'false';

// ============================================================================
// ID Generation
// ============================================================================

let idCounter = 0;

/** Reset ID counter between test files to ensure deterministic IDs */
export function resetIdCounter(): void {
  idCounter = 0;
}

function generateId(): string {
  idCounter++;
  return `00000000-0000-4000-a000-${String(idCounter).padStart(12, '0')}`;
}

function isoDate(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

/** Pre-built test UUIDs for consistent use across test files */
export const TEST_IDS = {
  user1: '00000000-0000-4000-a000-000000000001',
  user2: '00000000-0000-4000-a000-000000000002',
  def1: '00000000-0000-4000-a000-000000000011',
  def2: '00000000-0000-4000-a000-000000000012',
  fork1: '00000000-0000-4000-a000-000000000021',
  version1: '00000000-0000-4000-a000-000000000031',
  version2: '00000000-0000-4000-a000-000000000032',
};

// ============================================================================
// Schema Validation Guard
// ============================================================================

function validateMock<T>(schema: z.ZodType<T>, data: unknown, label: string): void {
  if (!STRICT_CONTRACTS) return;
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid mock ${label} data: ${result.error.message}`);
  }
}

// ============================================================================
// Mock Data Factories
// ============================================================================

export function createMockDefinition(overrides: Record<string, unknown> = {}): z.infer<typeof definitionSchema> {
  const data = {
    id: generateId(),
    type: 'agent',
    name: 'test-agent',
    version: '1.0.0',
    status: 'draft',
    yaml: 'agent:\n  interface:\n    name: test',
    hash: 'sha256:abc123',
    displayName: 'Test Agent',
    description: 'A test agent definition',
    domain: 'software',
    agentType: 'validator',
    author: null,
    provenance: null,
    tags: null,
    authorId: TEST_IDS.user1,
    orgId: null,
    namespace: null,
    tier: 'user',
    minSubscription: null,
    visibility: 'private',
    runtimeMd: null,
    promptHash: null,
    translatorVersion: null,
    schemaVersion: null,
    executionCount: 0,
    forkCount: 0,
    starCount: 0,
    forkedFromId: null,
    createdAt: isoDate(30),
    updatedAt: isoDate(1),
    publishedAt: null,
    deprecatedAt: null,
    ...overrides,
  };
  validateMock(definitionSchema, data, 'definition');
  return data as z.infer<typeof definitionSchema>;
}

export function createMockDefinitionListItem(overrides: Record<string, unknown> = {}): z.infer<typeof definitionListItemSchema> {
  const data = {
    id: generateId(),
    type: 'agent',
    name: 'test-agent',
    version: '1.0.0',
    status: 'published',
    displayName: 'Test Agent',
    description: 'A test agent',
    domain: 'software',
    agentType: 'validator',
    authorId: TEST_IDS.user1,
    tier: 'user',
    visibility: 'public',
    createdAt: isoDate(30),
    updatedAt: isoDate(1),
    executionCount: 10,
    forkCount: 0,
    starCount: 0,
    ...overrides,
  };
  validateMock(definitionListItemSchema, data, 'definitionListItem');
  return data as z.infer<typeof definitionListItemSchema>;
}

export function createMockVersionListItem(overrides: Record<string, unknown> = {}): z.infer<typeof versionListItemSchema> {
  const data = {
    id: generateId(),
    version: '1.0.0',
    hash: 'sha256:def456',
    createdAt: isoDate(10),
    createdBy: TEST_IDS.user1,
    ...overrides,
  };
  validateMock(versionListItemSchema, data, 'versionListItem');
  return data as z.infer<typeof versionListItemSchema>;
}

export function createMockModel(overrides: Record<string, unknown> = {}): z.infer<typeof modelSchema> {
  const data = {
    provider: 'anthropic',
    modelId: 'claude-3-opus',
    displayName: 'Claude 3 Opus',
    description: 'Most capable model',
    providerModelId: 'claude-3-opus-20240229',
    capabilities: { vision: true, tools: true, streaming: true, extendedThinking: false, structuredOutput: false },
    tier: 'premium',
    status: 'available',
    createdAt: isoDate(60),
    updatedAt: isoDate(1),
    ...overrides,
  };
  validateMock(modelSchema, data, 'model');
  return data as z.infer<typeof modelSchema>;
}

export function createMockPublicUser(overrides: Record<string, unknown> = {}): z.infer<typeof publicUserSchema> {
  const data = {
    id: generateId(),
    username: 'testuser',
    name: 'Test User',
    bio: null,
    websiteUrl: null,
    avatar: null,
    avatarMimeType: null,
    ...overrides,
  };
  validateMock(publicUserSchema, data, 'publicUser');
  return data as z.infer<typeof publicUserSchema>;
}

export function createMockProvider(overrides: Record<string, unknown> = {}): z.infer<typeof providerSchema> {
  const data = {
    id: 'anthropic',
    name: 'Anthropic',
    status: 'active' as const,
    ...overrides,
  };
  validateMock(providerSchema, data, 'provider');
  return data as z.infer<typeof providerSchema>;
}

export function createMockDependencyGraphResponse(
  overrides: Record<string, unknown> = {},
): z.infer<typeof dependencyGraphResponseSchema> {
  const rootId = generateId();
  const data = {
    definition: {
      type: 'agent' as const,
      name: 'test-agent',
      version: '1.0.0',
    },
    graph: {
      id: rootId,
      type: 'agent' as const,
      name: 'test-agent',
      version: '1.0.0',
      dependencies: [],
    },
    flat: [],
    totalCount: 0,
    maxDepth: 0,
    ...overrides,
  };
  validateMock(
    dependencyGraphResponseSchema,
    data,
    'dependencyGraphResponse',
  );
  return data as z.infer<typeof dependencyGraphResponseSchema>;
}

export function createMockDependentsResponse(
  overrides: Record<string, unknown> = {},
): z.infer<typeof dependentsResponseSchema> {
  const data = {
    definition: {
      type: 'agent' as const,
      name: 'test-agent',
      version: '1.0.0',
    },
    dependents: [],
    totalCount: 0,
    ...overrides,
  };
  validateMock(dependentsResponseSchema, data, 'dependentsResponse');
  return data as z.infer<typeof dependentsResponseSchema>;
}

export function createMockDependent(
  overrides: Record<string, unknown> = {},
): z.infer<typeof dependentSchema> {
  const data = {
    id: generateId(),
    type: 'agent' as const,
    name: 'caller-agent',
    version: '1.0.0',
    context: 'invokes.agent',
    ...overrides,
  };
  validateMock(dependentSchema, data, 'dependent');
  return data as z.infer<typeof dependentSchema>;
}

export function createMockFlatDep(
  overrides: Record<string, unknown> = {},
): z.infer<typeof flatDepSchema> {
  const data = {
    id: generateId(),
    type: 'agent' as const,
    name: 'dep-agent',
    version: '1.0.0',
    depth: 1,
    ...overrides,
  };
  validateMock(flatDepSchema, data, 'flatDep');
  return data as z.infer<typeof flatDepSchema>;
}

export function createMockRenderResult(overrides: Record<string, unknown> = {}): z.infer<typeof renderResultSchema> {
  const data = {
    markdown: '# Test Agent\n\nRendered content.',
    ...overrides,
  };
  validateMock(renderResultSchema, data, 'renderResult');
  return data as z.infer<typeof renderResultSchema>;
}

export function createMockValidationResult(overrides: Record<string, unknown> = {}): z.infer<typeof validationResultSchema> {
  const data = {
    valid: true,
    ...overrides,
  };
  validateMock(validationResultSchema, data, 'validationResult');
  return data as z.infer<typeof validationResultSchema>;
}

export function createMockVersionDiffSummary(overrides: Record<string, unknown> = {}) {
  const data = {
    fromVersion: '1.0.0',
    toVersion: '1.1.0',
    fromHash: 'sha256:aaa',
    toHash: 'sha256:bbb',
    hasChanges: true,
    fromPromptHash: null,
    toPromptHash: null,
    hasPromptChanges: false,
    fromLineCount: 100,
    toLineCount: 110,
    sectionsAdded: [],
    sectionsRemoved: [],
    sectionsModified: ['scoring'],
    sectionsUnchanged: ['interface', 'defaults'],
    ...overrides,
  };
  validateMock(versionDiffSummarySchema, data, 'versionDiffSummary');
  return data;
}

// ============================================================================
// Nock Helpers with Contract Validation
// ============================================================================

/**
 * Register a nock interceptor with schema validation of the mock data.
 * Validates { data: responseData } against the wrapped schema before registering.
 */
export function mockValidatedEndpoint<T extends z.ZodTypeAny>(
  baseUrl: string,
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  responseData: unknown,
  schema: T,
  statusCode = 200,
): nock.Scope {
  if (STRICT_CONTRACTS) {
    const wrappedSchema = createApiResponseSchema(schema);
    const result = wrappedSchema.safeParse({ data: responseData });
    if (!result.success) {
      throw new Error(
        `Mock response for ${method.toUpperCase()} ${path} does not match schema:\n${result.error.message}`,
      );
    }
  }
  return nock(baseUrl)[method](path).reply(statusCode, { data: responseData });
}

/**
 * Register a nock interceptor for list endpoints with schema validation.
 */
export function mockValidatedListEndpoint<T extends z.ZodTypeAny>(
  baseUrl: string,
  method: 'get' | 'post',
  path: string,
  responseData: unknown[],
  itemSchema: T,
  statusCode = 200,
): nock.Scope {
  if (STRICT_CONTRACTS) {
    const listSchema = createListResponseSchema(itemSchema);
    const result = listSchema.safeParse({ data: responseData });
    if (!result.success) {
      throw new Error(
        `Mock list response for ${method.toUpperCase()} ${path} does not match schema:\n${result.error.message}`,
      );
    }
  }
  return nock(baseUrl)[method](path).reply(statusCode, { data: responseData });
}

// ============================================================================
// Re-exports for single-import convenience
// ============================================================================

export {
  // All response schemas
  validationResultSchema,
  renderResultSchema,
  translatorVersionSchema,
  forkableCheckSchema,
  publicUserSchema,
  modelSyncResultSchema,
  providerSchema,
  providersListResponseSchema,
  definitionListItemSchema,
  definitionListResponseSchema,
  versionListItemSchema,
  versionsListResponseSchema,
  modelCapabilitiesSchema,
  modelSchema,
  modelAliasSchema,
  modelsListResponseSchema,
  aliasesListResponseSchema,
  aliasResolutionSchema,
  forkSchema,
  forkResponseSchema,
  forkLineageSchema,
  forkListResponseSchema,
  dependencyNodeSchema,
  dependencyGraphResponseSchema,
  dependentsResponseSchema,
  dependentSchema,
  flatDepSchema,
  upgradeResultSchema,
  batchUserResponseSchema,
  failureDomainDistributionSchema,
  healthFactorSchema,
  definitionRefSchema,
  definitionEffectivenessSchema,
  definitionHealthSchema,
  ecosystemOverviewSchema,
  lineageResultSchema,
  lineageNodeSchema,
  evolutionResultSchema,
  translationAnalyticsResultSchema,
  compareResultSchema,
  diffImpactResultSchema,
  versionDiffSchema,
  versionDiffSummarySchema,
  versionFieldDiffSchema,
  versionUnifiedDiffSchema,
  // Input schemas
  definitionSchema,
  // Factories (test-only, defined locally)
  createApiResponseSchema,
  createListResponseSchema,
};

export { STRICT_CONTRACTS };
