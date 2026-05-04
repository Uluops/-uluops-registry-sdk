/**
 * Response Schema Unit Tests
 *
 * Tests each Zod response schema with safeParse:
 * - Positive: valid factory data passes
 * - Negative: missing required fields / wrong types fail
 */

import { describe, it, expect } from 'vitest';
import {
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
  modelSchema,
  modelsListResponseSchema,
  aliasesListResponseSchema,
  aliasResolutionSchema,
  forkResponseSchema,
  forkLineageSchema,
  forkListResponseSchema,
  dependencyGraphSchema,
  upgradeResultSchema,
  batchUserResponseSchema,
  definitionEffectivenessSchema,
  definitionHealthSchema,
  ecosystemOverviewSchema,
  lineageResultSchema,
  evolutionResultSchema,
  translationAnalyticsResultSchema,
  compareResultSchema,
  diffImpactResultSchema,
  versionDiffSchema,
  versionDiffSummarySchema,
  versionFieldDiffSchema,
  versionUnifiedDiffSchema,
} from '../src/types/response-schemas.js';
import {
  createMockDefinition,
  createMockDefinitionListItem,
  createMockVersionListItem,
  createMockModel,
  createMockPublicUser,
  createMockProvider,
  createMockDependencyGraph,
  createMockRenderResult,
  createMockValidationResult,
  createMockVersionDiffSummary,
} from './contract-helpers.js';

// ============================================================================
// Phase 1: Simple Schemas
// ============================================================================

describe('validationResultSchema', () => {
  it('accepts valid result', () => {
    expect(validationResultSchema.safeParse({ valid: true }).success).toBe(true);
  });

  it('accepts result with errors', () => {
    const result = validationResultSchema.safeParse({
      valid: false,
      errors: [{ path: '/interface/name', message: 'Required' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing valid field', () => {
    expect(validationResultSchema.safeParse({}).success).toBe(false);
  });
});

describe('renderResultSchema', () => {
  it('accepts valid result', () => {
    expect(renderResultSchema.safeParse(createMockRenderResult()).success).toBe(true);
  });

  it('accepts result with all optional fields', () => {
    const result = renderResultSchema.safeParse({
      markdown: '# Test',
      promptHash: 'sha256:abc',
      variables: ['target'],
      target: 'opencode',
      warnings: [{ field: 'model', reason: 'Anthropic-specific', level: 'info' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing markdown', () => {
    expect(renderResultSchema.safeParse({}).success).toBe(false);
  });
});

describe('translatorVersionSchema', () => {
  it('accepts valid result', () => {
    expect(translatorVersionSchema.safeParse({ translatorVersion: '0.33.0' }).success).toBe(true);
  });

  it('rejects missing translatorVersion', () => {
    expect(translatorVersionSchema.safeParse({}).success).toBe(false);
  });
});

describe('forkableCheckSchema', () => {
  it('accepts valid result', () => {
    expect(forkableCheckSchema.safeParse({ canFork: true }).success).toBe(true);
  });

  it('rejects wrong type for canFork', () => {
    expect(forkableCheckSchema.safeParse({ canFork: 'yes' }).success).toBe(false);
  });
});

describe('publicUserSchema', () => {
  it('accepts valid user', () => {
    expect(publicUserSchema.safeParse(createMockPublicUser()).success).toBe(true);
  });

  it('rejects missing id', () => {
    expect(publicUserSchema.safeParse({ username: 'test' }).success).toBe(false);
  });
});

describe('modelSyncResultSchema', () => {
  it('accepts valid result', () => {
    const result = modelSyncResultSchema.safeParse({
      providersAdded: 1, providersUpdated: 0, modelsAdded: 5, modelsUpdated: 2,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative counts', () => {
    const result = modelSyncResultSchema.safeParse({
      providersAdded: -1, providersUpdated: 0, modelsAdded: 0, modelsUpdated: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('providerSchema', () => {
  it('accepts valid provider', () => {
    expect(providerSchema.safeParse(createMockProvider()).success).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(providerSchema.safeParse({ id: 'x', name: 'X', status: 'unknown' }).success).toBe(false);
  });
});

// ============================================================================
// Phase 2: Composite Schemas
// ============================================================================

describe('definitionListItemSchema', () => {
  it('accepts valid item', () => {
    expect(definitionListItemSchema.safeParse(createMockDefinitionListItem()).success).toBe(true);
  });

  it('rejects invalid type enum', () => {
    const item = createMockDefinitionListItem();
    (item as Record<string, unknown>).type = 'invalid';
    expect(definitionListItemSchema.safeParse(item).success).toBe(false);
  });
});

describe('definitionListResponseSchema', () => {
  it('accepts valid list response', () => {
    const result = definitionListResponseSchema.safeParse({
      definitions: [createMockDefinitionListItem()],
      total: 1, limit: 20, offset: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing total', () => {
    expect(definitionListResponseSchema.safeParse({
      definitions: [], limit: 20, offset: 0,
    }).success).toBe(false);
  });
});

describe('versionListItemSchema', () => {
  it('accepts valid item', () => {
    expect(versionListItemSchema.safeParse(createMockVersionListItem()).success).toBe(true);
  });

  it('rejects non-uuid id', () => {
    const item = { ...createMockVersionListItem(), id: 'not-a-uuid' };
    expect(versionListItemSchema.safeParse(item).success).toBe(false);
  });
});

describe('modelSchema', () => {
  it('accepts valid model', () => {
    expect(modelSchema.safeParse(createMockModel()).success).toBe(true);
  });

  it('rejects missing capabilities', () => {
    const model = createMockModel();
    delete (model as Record<string, unknown>).capabilities;
    expect(modelSchema.safeParse(model).success).toBe(false);
  });
});

describe('dependencyGraphSchema', () => {
  it('accepts valid graph', () => {
    expect(dependencyGraphSchema.safeParse(createMockDependencyGraph()).success).toBe(true);
  });

  it('rejects wrong type for nodes', () => {
    expect(dependencyGraphSchema.safeParse({ nodes: 'not-an-array' }).success).toBe(false);
  });
});

describe('forkListResponseSchema', () => {
  it('accepts valid response', () => {
    const result = forkListResponseSchema.safeParse({
      items: [createMockDefinitionListItem()],
      total: 1,
    });
    expect(result.success).toBe(true);
  });
});

describe('batchUserResponseSchema', () => {
  it('accepts record of users', () => {
    const result = batchUserResponseSchema.safeParse({
      [createMockPublicUser().id]: createMockPublicUser(),
    });
    expect(result.success).toBe(true);
  });

  it('accepts null values', () => {
    expect(batchUserResponseSchema.safeParse({ 'some-id': null }).success).toBe(true);
  });
});

// ============================================================================
// Phase 3: Analytics Schemas
// ============================================================================

describe('definitionEffectivenessSchema', () => {
  it('accepts valid effectiveness', () => {
    const result = definitionEffectivenessSchema.safeParse({
      definition: { type: 'agent', name: 'test', version: '1.0.0' },
      period: { start: '2026-01-01', end: '2026-02-01' },
      metrics: {
        executionCount: 10, uniqueProjects: 2, uniqueUsers: 1,
        effectiveness: null, healthScore: null,
        factorCompleteness: 0, healthFactors: [],
      },
      stale: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing stale field', () => {
    const result = definitionEffectivenessSchema.safeParse({
      definition: { type: 'agent', name: 'test', version: '1.0.0' },
      period: { start: '2026-01-01', end: '2026-02-01' },
      metrics: { executionCount: 0, uniqueProjects: 0, uniqueUsers: 0, effectiveness: null, healthScore: null, factorCompleteness: 0, healthFactors: [] },
    });
    expect(result.success).toBe(false);
  });
});

describe('definitionHealthSchema', () => {
  it('accepts valid health', () => {
    const result = definitionHealthSchema.safeParse({
      definition: { type: 'agent', name: 'test', version: '1.0.0' },
      healthScore: 85, grade: 'B+', provisional: false,
      caveats: [], issueProfile: null, factors: [], stale: false,
    });
    expect(result.success).toBe(true);
  });
});

describe('ecosystemOverviewSchema', () => {
  it('accepts valid overview', () => {
    const result = ecosystemOverviewSchema.safeParse({
      definitions: { total: 100, byType: { agent: 50, command: 30, workflow: 20 } },
      execution: { totalRuns: 500, uniqueProjects: 10 },
      effectiveness: {
        avgHealthScore: 75,
        ecosystemTaxonomy: null,
        topPerformers: [],
        needsAttention: [],
      },
      stale: false,
    });
    expect(result.success).toBe(true);
  });
});

describe('evolutionResultSchema', () => {
  it('accepts valid evolution', () => {
    const result = evolutionResultSchema.safeParse({
      definition: { type: 'agent', name: 'test', version: '1.0.0' },
      versions: [],
      trend: 'stable',
      trendConfidence: null,
      overallTrend: {
        trajectory: 'insufficient_data',
        passRateChange: null, runAvgScoreChange: null, epistemicDensityChange: null,
      },
      stale: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid trend enum', () => {
    const result = evolutionResultSchema.safeParse({
      definition: { type: 'agent', name: 'test', version: '1.0.0' },
      versions: [], trend: 'unknown', trendConfidence: null,
      overallTrend: { trajectory: 'stable', passRateChange: null, runAvgScoreChange: null, epistemicDensityChange: null },
      stale: false,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Phase 4: Version Diff Schemas
// ============================================================================

describe('versionDiffSummarySchema', () => {
  it('accepts valid summary', () => {
    expect(versionDiffSummarySchema.safeParse(createMockVersionDiffSummary()).success).toBe(true);
  });

  it('rejects missing sections arrays', () => {
    const { sectionsAdded, ...rest } = createMockVersionDiffSummary();
    expect(versionDiffSummarySchema.safeParse(rest).success).toBe(false);
  });
});

describe('versionDiffSchema', () => {
  it('accepts valid full diff', () => {
    const result = versionDiffSchema.safeParse({
      fromVersion: '1.0.0', toVersion: '1.1.0',
      fromHash: 'a', toHash: 'b', hasChanges: true,
      fromPromptHash: null, toPromptHash: null, hasPromptChanges: false,
      fromYaml: 'old yaml', toYaml: 'new yaml',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing fromYaml', () => {
    const result = versionDiffSchema.safeParse({
      fromVersion: '1.0.0', toVersion: '1.1.0',
      fromHash: 'a', toHash: 'b', hasChanges: true,
      fromPromptHash: null, toPromptHash: null, hasPromptChanges: false,
      toYaml: 'new yaml',
    });
    expect(result.success).toBe(false);
  });
});

describe('versionFieldDiffSchema', () => {
  it('accepts valid field diff', () => {
    const result = versionFieldDiffSchema.safeParse({
      fromVersion: '1.0.0', toVersion: '1.1.0',
      fromHash: 'a', toHash: 'b', hasChanges: true,
      fromPromptHash: null, toPromptHash: null, hasPromptChanges: false,
      fields: [{ path: 'scoring.maxScore', type: 'modified', oldValue: 100, newValue: 200 }],
      summary: { added: 0, removed: 0, modified: 1, unchanged: 5 },
      sections: { added: [], removed: [], modified: ['scoring'], unchanged: ['interface'] },
      classified: [{ path: 'scoring.maxScore', type: 'modified', significance: 'structural', reason: 'Score range changed' }],
      suggestedBump: 'minor',
    });
    expect(result.success).toBe(true);
  });
});

describe('versionUnifiedDiffSchema', () => {
  it('accepts valid unified diff', () => {
    const result = versionUnifiedDiffSchema.safeParse({
      fromVersion: '1.0.0', toVersion: '1.1.0',
      fromHash: 'a', toHash: 'b', hasChanges: true,
      fromPromptHash: null, toPromptHash: null, hasPromptChanges: false,
      unified: '--- a\n+++ b\n@@ -1 +1 @@\n-old\n+new',
      fromLineCount: 100, toLineCount: 105,
    });
    expect(result.success).toBe(true);
  });
});
