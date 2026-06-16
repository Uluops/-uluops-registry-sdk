/**
 * Tests for analytics operations
 *
 * Covers all 8 analytics functions: URL construction, query parameter forwarding,
 * and response handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import nock from 'nock';
import { RegistryHttpClient } from '../src/http/http-client.js';
import * as analyticsOps from '../src/operations/analytics.js';
import { ResponseValidationError } from '../src/errors/errors.js';
import { TEST_API_KEY, MOCK_BASE_URL } from './setup.js';

describe('analytics', () => {
  let http: RegistryHttpClient;

  beforeEach(() => {
    http = new RegistryHttpClient({ apiKey: TEST_API_KEY });
  });

  // ── getEffectiveness ──────────────────────────────────────────

  describe('getEffectiveness', () => {
    it('fetches effectiveness without version', async () => {
      nock(MOCK_BASE_URL)
        .get('/analytics/definitions/agent/code-validator/effectiveness')
        .reply(200, {
          data: {
            definition: { type: 'agent', name: 'code-validator', version: '1.0.0' },
            period: { start: '2026-03-01', end: '2026-04-01' },
            metrics: { executionCount: 50, uniqueProjects: 5, uniqueUsers: 3, effectiveness: null, healthScore: 67, factorCompleteness: 40, healthFactors: [] },
            stale: false,
          },
        });

      const result = await analyticsOps.getEffectiveness(http, 'agent', 'code-validator');
      expect(result.definition.name).toBe('code-validator');
      expect(result.metrics.executionCount).toBe(50);
      expect(result.stale).toBe(false);
    });

    it('appends version query param when provided', async () => {
      nock(MOCK_BASE_URL)
        .get('/analytics/definitions/agent/code-validator/effectiveness')
        .query({ version: '2.0.0' })
        .reply(200, {
          data: {
            definition: { type: 'agent', name: 'code-validator', version: '2.0.0' },
            period: { start: '2026-03-01', end: '2026-04-01' },
            metrics: { executionCount: 10, uniqueProjects: 2, uniqueUsers: 1, effectiveness: null, healthScore: null, factorCompleteness: 0, healthFactors: [] },
            stale: false,
          },
        });

      const result = await analyticsOps.getEffectiveness(http, 'agent', 'code-validator', '2.0.0');
      expect(result.definition.version).toBe('2.0.0');
    });

    it('does not append version query param when omitted', async () => {
      // nock without .query() will fail if a query string is sent
      nock(MOCK_BASE_URL)
        .get('/analytics/definitions/pipeline/ship/effectiveness')
        .reply(200, { data: { definition: { type: 'pipeline', name: 'ship', version: '1.0.0' }, period: { start: '', end: '' }, metrics: { executionCount: 0, uniqueProjects: 0, uniqueUsers: 0, effectiveness: null, healthScore: null, factorCompleteness: 0, healthFactors: [] }, stale: false } });

      await expect(analyticsOps.getEffectiveness(http, 'pipeline', 'ship')).resolves.not.toThrow();
    });

    it('rejects invalid version', async () => {
      await expect(
        analyticsOps.getEffectiveness(http, 'agent', 'code-validator', 'bad')
      ).rejects.toThrow('semver');
    });
  });

  // ── getHealth ─────────────────────────────────────────────────

  describe('getHealth', () => {
    it('fetches health grade', async () => {
      nock(MOCK_BASE_URL)
        .get('/analytics/definitions/agent/code-validator/health')
        .reply(200, {
          data: {
            definition: { type: 'agent', name: 'code-validator', version: '1.0.0' },
            healthScore: 85,
            grade: 'B',
            provisional: true,
            caveats: ['PROVISIONAL: weights unvalidated'],
            issueProfile: { failureDomainDistribution: { STR: 30, SEM: 25, PRA: 25, EPI: 20 }, epistemicDensity: 45, dominantDomain: 'STR', interpretation: 'test' },
            factors: [],
            stale: false,
          },
        });

      const result = await analyticsOps.getHealth(http, 'agent', 'code-validator');
      expect(result.grade).toBe('B');
      expect(result.healthScore).toBe(85);
      expect(result.provisional).toBe(true);
      expect(result.caveats).toHaveLength(1);
    });

    it('appends version query param when provided', async () => {
      nock(MOCK_BASE_URL)
        .get('/analytics/definitions/agent/code-validator/health')
        .query({ version: '1.2.0' })
        .reply(200, { data: { definition: { type: 'agent', name: 'code-validator', version: '1.2.0' }, healthScore: null, grade: null, provisional: true, caveats: [], issueProfile: null, factors: [], stale: false } });

      const result = await analyticsOps.getHealth(http, 'agent', 'code-validator', '1.2.0');
      expect(result.definition.version).toBe('1.2.0');
    });

    it('rejects invalid version', async () => {
      await expect(
        analyticsOps.getHealth(http, 'agent', 'code-validator', 'bad')
      ).rejects.toThrow('semver');
    });
  });

  // ── getEcosystemOverview ──────────────────────────────────────

  describe('getEcosystemOverview', () => {
    it('fetches ecosystem overview', async () => {
      nock(MOCK_BASE_URL)
        .get('/analytics/ecosystem/overview')
        .reply(200, {
          data: {
            definitions: { total: 42, byType: { agent: 30, command: 8, workflow: 3, pipeline: 1 } },
            execution: { totalRuns: 1200, uniqueProjects: 15 },
            effectiveness: { avgHealthScore: 72, ecosystemTaxonomy: null, topPerformers: [], needsAttention: [] },
            stale: false,
          },
        });

      const result = await analyticsOps.getEcosystemOverview(http);
      expect(result.definitions.total).toBe(42);
      expect(result.definitions.byType.agent).toBe(30);
      expect(result.execution.totalRuns).toBe(1200);
      expect(result.stale).toBe(false);
    });
  });

  // ── getLineage ────────────────────────────────────────────────

  describe('getLineage', () => {
    it('fetches lineage tree', async () => {
      nock(MOCK_BASE_URL)
        .get('/analytics/definitions/agent/code-validator/lineage')
        .reply(200, {
          data: {
            root: { type: 'agent', name: 'code-validator', version: '1.0.0', authorId: 'u1', relationship: 'root', healthScore: 67, translatorVersion: '4.0.0', status: 'published', createdAt: '2026-01-01', versions: [], forks: [] },
            totalVersions: 3,
            totalForks: 1,
            statistics: {
              totalExecutions: 100,
              activeVariants: 3,
              mostForked: null,
              mostExecuted: null,
              highestEffectiveness: null,
            },
            stale: false,
          },
        });

      const result = await analyticsOps.getLineage(http, 'agent', 'code-validator');
      expect(result.root.relationship).toBe('root');
      expect(result.totalVersions).toBe(3);
      expect(result.totalForks).toBe(1);
    });
  });

  // ── getEvolution ──────────────────────────────────────────────

  describe('getEvolution', () => {
    it('fetches evolution timeline with trend', async () => {
      nock(MOCK_BASE_URL)
        .get('/analytics/definitions/agent/code-validator/evolution')
        .reply(200, {
          data: {
            definition: { type: 'agent', name: 'code-validator', version: '1.0.0' },
            versions: [
              { version: '1.0.0', publishedAt: '2026-01-01', translatorVersion: '3.0.0', changeSummary: null, metrics: { passRate: 70, runAvgScore: 75, runCount: 40, healthScore: 60 } },
              { version: '1.1.0', publishedAt: '2026-02-01', translatorVersion: '4.0.0', changeSummary: null, metrics: { passRate: 85, runAvgScore: 88, runCount: 60, healthScore: 80 } },
            ],
            trend: 'improving',
            trendConfidence: 'medium',
            overallTrend: { trajectory: 'consistent_improvement', passRateChange: null, runAvgScoreChange: null, epistemicDensityChange: null },
            stale: false,
          },
        });

      const result = await analyticsOps.getEvolution(http, 'agent', 'code-validator');
      expect(result.trend).toBe('improving');
      expect(result.trendConfidence).toBe('medium');
      expect(result.versions).toHaveLength(2);
    });
  });

  // ── getTranslation ────────────────────────────────────────────

  describe('getTranslation', () => {
    it('fetches translation analytics grouped by translator version', async () => {
      nock(MOCK_BASE_URL)
        .get('/analytics/definitions/agent/code-validator/translation')
        .reply(200, {
          data: {
            definition: { type: 'agent', name: 'code-validator', version: '1.0.0' },
            currentTranslatorVersion: '4.1.0',
            groups: [
              { translatorVersion: '3.0.0', isCurrent: false, versions: ['1.0.0'], aggregateMetrics: { totalRuns: 40, avgPassRate: 70, runAvgScore: 75 } },
              { translatorVersion: '4.1.0', isCurrent: true, versions: ['1.1.0'], aggregateMetrics: { totalRuns: 60, avgPassRate: 85, runAvgScore: 88 } },
            ],
            upgradeAvailable: false,
            projectedImprovement: null,
            recommendation: null,
            stale: false,
          },
        });

      const result = await analyticsOps.getTranslation(http, 'agent', 'code-validator');
      expect(result.currentTranslatorVersion).toBe('4.1.0');
      expect(result.groups).toHaveLength(2);
      expect(result.groups[1]!.isCurrent).toBe(true);
    });
  });

  // ── compare ───────────────────────────────────────────────────

  describe('compare', () => {
    it('joins versions as comma-separated query param', async () => {
      nock(MOCK_BASE_URL)
        .get('/analytics/definitions/agent/code-validator/effectiveness/compare')
        .query({ versions: '1.0.0,1.1.0,1.2.0' })
        .reply(200, {
          data: {
            definition: { type: 'agent', name: 'code-validator', version: '1.0.0' },
            versions: [
              { version: '1.0.0', passRate: 70, runAvgScore: 75, runCount: 40, healthScore: 60, translatorVersion: '3.0.0', failureDomainDistribution: null, epistemicDensity: null },
              { version: '1.1.0', passRate: 85, runAvgScore: 88, runCount: 60, healthScore: 80, translatorVersion: '4.0.0', failureDomainDistribution: null, epistemicDensity: null },
              { version: '1.2.0', passRate: 90, runAvgScore: 92, runCount: 30, healthScore: 85, translatorVersion: '4.1.0', failureDomainDistribution: null, epistemicDensity: null },
            ],
            stale: false,
          },
        });

      const result = await analyticsOps.compare(http, 'agent', 'code-validator', ['1.0.0', '1.1.0', '1.2.0']);
      expect(result.versions).toHaveLength(3);
      expect(result.versions[2]!.passRate).toBe(90);
    });

    it('handles two-version comparison', async () => {
      nock(MOCK_BASE_URL)
        .get('/analytics/definitions/command/commit-push/effectiveness/compare')
        .query({ versions: '1.0.0,2.0.0' })
        .reply(200, { data: { definition: { type: 'command', name: 'commit-push', version: '1.0.0' }, versions: [], stale: false } });

      const result = await analyticsOps.compare(http, 'command', 'commit-push', ['1.0.0', '2.0.0']);
      expect(result.definition.name).toBe('commit-push');
    });

    it('rejects fewer than 2 versions', async () => {
      await expect(
        analyticsOps.compare(http, 'agent', 'code-validator', ['1.0.0'])
      ).rejects.toThrow('requires 2-5 versions');
    });

    it('rejects more than 5 versions', async () => {
      await expect(
        analyticsOps.compare(http, 'agent', 'code-validator', ['1', '2', '3', '4', '5', '6'])
      ).rejects.toThrow('requires 2-5 versions');
    });

    it('rejects empty versions array', async () => {
      await expect(
        analyticsOps.compare(http, 'agent', 'code-validator', [])
      ).rejects.toThrow('requires 2-5 versions');
    });

    it('rejects invalid semver in versions array', async () => {
      await expect(
        analyticsOps.compare(http, 'agent', 'code-validator', ['bad', '1.0.0'])
      ).rejects.toThrow('semver');
    });
  });

  // ── getDiffImpact ─────────────────────────────────────────────

  describe('getDiffImpact', () => {
    it('rejects invalid fromVersion', async () => {
      await expect(
        analyticsOps.getDiffImpact(http, 'agent', 'code-validator', 'bad', '1.0.0')
      ).rejects.toThrow('semver');
    });

    it('rejects invalid toVersion', async () => {
      await expect(
        analyticsOps.getDiffImpact(http, 'agent', 'code-validator', '1.0.0', 'bad')
      ).rejects.toThrow('semver');
    });

    it('constructs correct URL with both versions', async () => {
      nock(MOCK_BASE_URL)
        .get('/analytics/definitions/agent/code-validator/diff/1.0.0/1.1.0/impact')
        .reply(200, {
          data: {
            definition: { type: 'agent', name: 'code-validator', version: '1.0.0' },
            diff: { hasChanges: true, sectionsAdded: [], sectionsRemoved: [], sectionsModified: ['agent'], fromLineCount: 100, toLineCount: 120 },
            from: { version: '1.0.0', passRate: 70, runAvgScore: 75, runCount: 40 },
            to: { version: '1.1.0', passRate: 85, runAvgScore: 88, runCount: 60 },
            deltas: { passRateDelta: 15, runAvgScoreDelta: 13, runCountDelta: 20 },
            categorizedChanges: [],
            taxonomyShift: null,
            caveats: ['OBSERVATIONAL: metric deltas are correlational, not causal.'],
            stale: false,
          },
        });

      const result = await analyticsOps.getDiffImpact(http, 'agent', 'code-validator', '1.0.0', '1.1.0');
      expect(result.deltas.passRateDelta).toBe(15);
      expect(result.caveats).toHaveLength(1);
      expect(result.diff.hasChanges).toBe(true);
    });
  });

  // ── Response Validation Wiring ────────────────────────────────
  // Verify that Zod schema validation catches malformed responses

  describe('response validation', () => {
    it('getHealth rejects missing grade field', async () => {
      nock(MOCK_BASE_URL)
        .get('/analytics/definitions/agent/test/health')
        .reply(200, {
          data: {
            definition: { type: 'agent', name: 'test', version: '1.0.0' },
            healthScore: 85,
            // grade missing
            provisional: true,
            caveats: [],
            issueProfile: null,
            factors: [],
            stale: false,
          },
        });
      await expect(analyticsOps.getHealth(http, 'agent', 'test')).rejects.toThrow(ResponseValidationError);
    });

    it('getEcosystemOverview rejects missing definitions field', async () => {
      nock(MOCK_BASE_URL)
        .get('/analytics/ecosystem/overview')
        .reply(200, { data: { execution: { totalRuns: 0, uniqueProjects: 0 }, effectiveness: {}, stale: false } });
      await expect(analyticsOps.getEcosystemOverview(http)).rejects.toThrow(ResponseValidationError);
    });

    it('getLineage rejects missing root field', async () => {
      nock(MOCK_BASE_URL)
        .get('/analytics/definitions/agent/test/lineage')
        .reply(200, { data: { totalVersions: 0, totalForks: 0, statistics: {}, stale: false } });
      await expect(analyticsOps.getLineage(http, 'agent', 'test')).rejects.toThrow(ResponseValidationError);
    });

    it('getEvolution rejects missing versions array', async () => {
      nock(MOCK_BASE_URL)
        .get('/analytics/definitions/agent/test/evolution')
        .reply(200, {
          data: {
            definition: { type: 'agent', name: 'test', version: '1.0.0' },
            trend: 'improving',
            trendConfidence: 'medium',
            overallTrend: {},
            stale: false,
          },
        });
      await expect(analyticsOps.getEvolution(http, 'agent', 'test')).rejects.toThrow(ResponseValidationError);
    });

    it('getTranslation rejects missing groups array', async () => {
      nock(MOCK_BASE_URL)
        .get('/analytics/definitions/agent/test/translation')
        .reply(200, {
          data: {
            definition: { type: 'agent', name: 'test', version: '1.0.0' },
            currentTranslatorVersion: '4.0.0',
            // groups missing
            upgradeAvailable: false,
            stale: false,
          },
        });
      await expect(analyticsOps.getTranslation(http, 'agent', 'test')).rejects.toThrow(ResponseValidationError);
    });

    it('compare rejects missing versions array in response', async () => {
      nock(MOCK_BASE_URL)
        .get('/analytics/definitions/agent/test/effectiveness/compare')
        .query({ versions: '1.0.0,2.0.0' })
        .reply(200, {
          data: {
            definition: { type: 'agent', name: 'test', version: '1.0.0' },
            // versions missing
            stale: false,
          },
        });
      await expect(analyticsOps.compare(http, 'agent', 'test', ['1.0.0', '2.0.0'])).rejects.toThrow(ResponseValidationError);
    });

    it('getDiffImpact rejects missing deltas', async () => {
      nock(MOCK_BASE_URL)
        .get('/analytics/definitions/agent/test/diff/1.0.0/2.0.0/impact')
        .reply(200, {
          data: {
            definition: { type: 'agent', name: 'test', version: '1.0.0' },
            diff: { hasChanges: true, sectionsAdded: [], sectionsRemoved: [], sectionsModified: [], fromLineCount: 0, toLineCount: 0 },
            from: { version: '1.0.0', passRate: 0, runAvgScore: 0, runCount: 0 },
            to: { version: '2.0.0', passRate: 0, runAvgScore: 0, runCount: 0 },
            // deltas missing
            categorizedChanges: [],
            taxonomyShift: null,
            caveats: [],
            stale: false,
          },
        });
      await expect(analyticsOps.getDiffImpact(http, 'agent', 'test', '1.0.0', '2.0.0')).rejects.toThrow(ResponseValidationError);
    });
  });
});
