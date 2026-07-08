/**
 * Tests for Zod schemas — ensures new fields are accepted and validated
 */

import { describe, it, expect } from 'vitest';
import { definitionSchema } from '../src/types/schemas.js';
import { isVerdictTrustworthy, type RiskProfile } from '../src/types/definitions.js';

/** A risk profile whose sync scan failed — 'none' is a sentinel, not a verdict. */
function makeFailedRiskProfile(): RiskProfile {
  return {
    sync: {
      version: '1.0.0',
      scannedAt: '2026-01-01T00:00:00Z',
      capabilities: { tools: [], preflightCommands: 0 },
      signals: [],
      riskLevel: 'none',
    },
    deep: null,
    aggregateRiskLevel: 'none',
    lastUpdated: '2026-01-01T00:00:00Z',
    scanStatus: 'failed',
    scanFailedReason: 'timeout',
  };
}

/** Minimal valid definition for schema parsing */
function makeDefinition(overrides?: Record<string, unknown>) {
  return {
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    type: 'agent',
    name: 'test-agent',
    version: '1.0.0',
    status: 'published',
    hash: 'abc123',
    displayName: 'Test Agent',
    description: 'A test',
    domain: 'software',
    tier: 'org',
    visibility: 'public',
    authorId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    executionCount: 0,
    uniqueExecutionCount: 0,
    forkCount: 0,
    starCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('definitionSchema', () => {
  it('accepts minSubscription field with valid tier values', () => {
    for (const tier of ['free', 'hobbyist', 'plus', 'pro', 'enterprise']) {
      const result = definitionSchema.safeParse(makeDefinition({ minSubscription: tier }));
      expect(result.success, `should accept minSubscription: '${tier}'`).toBe(true);
      if (result.success) {
        expect(result.data.minSubscription).toBe(tier);
      }
    }
  });

  it('accepts null minSubscription', () => {
    const result = definitionSchema.safeParse(makeDefinition({ minSubscription: null }));
    expect(result.success).toBe(true);
  });

  it('accepts undefined minSubscription', () => {
    const result = definitionSchema.safeParse(makeDefinition());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.minSubscription).toBeUndefined();
    }
  });

  it('rejects invalid minSubscription values', () => {
    const result = definitionSchema.safeParse(makeDefinition({ minSubscription: 'premium' }));
    expect(result.success).toBe(false);
  });

  it('accepts proRestricted boolean field', () => {
    const result = definitionSchema.safeParse(makeDefinition({ proRestricted: true }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.proRestricted).toBe(true);
    }
  });

  it('accepts proRestricted: false', () => {
    const result = definitionSchema.safeParse(makeDefinition({ proRestricted: false }));
    expect(result.success).toBe(true);
  });

  it('accepts missing proRestricted (defaults to undefined)', () => {
    const result = definitionSchema.safeParse(makeDefinition());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.proRestricted).toBeUndefined();
    }
  });

  it('preserves minSubscription and proRestricted through parse', () => {
    const input = makeDefinition({
      minSubscription: 'plus',
      proRestricted: true,
      yaml: null,
    });
    const result = definitionSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.minSubscription).toBe('plus');
      expect(result.data.proRestricted).toBe(true);
      expect(result.data.yaml).toBeNull();
    }
  });

  it('preserves riskProfile.scanStatus and scanFailedReason through parse (failed scan)', () => {
    const result = definitionSchema.safeParse(
      makeDefinition({ riskProfile: makeFailedRiskProfile() }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.riskProfile?.scanStatus).toBe('failed');
      expect(result.data.riskProfile?.scanFailedReason).toBe('timeout');
    }
  });

  it('accepts a legacy riskProfile with no scanStatus (defaults undefined)', () => {
    const profile = makeFailedRiskProfile();
    delete profile.scanStatus;
    delete profile.scanFailedReason;
    const result = definitionSchema.safeParse(makeDefinition({ riskProfile: profile }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.riskProfile?.scanStatus).toBeUndefined();
    }
  });

  it('accepts deep.status and errorReason on a failed deep analysis', () => {
    const profile = makeFailedRiskProfile();
    profile.scanStatus = 'complete';
    profile.deep = {
      version: '1.0.0',
      analyzedAt: '2026-01-01T00:00:00Z',
      findings: [],
      riskLevel: 'none',
      status: 'error',
      errorReason: 'no_output',
    };
    const result = definitionSchema.safeParse(makeDefinition({ riskProfile: profile }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.riskProfile?.deep?.status).toBe('error');
    }
  });
});

describe('isVerdictTrustworthy', () => {
  it('returns false for a failed sync scan', () => {
    expect(isVerdictTrustworthy(makeFailedRiskProfile())).toBe(false);
  });

  it('returns false for a null/undefined profile (never scanned)', () => {
    expect(isVerdictTrustworthy(null)).toBe(false);
    expect(isVerdictTrustworthy(undefined)).toBe(false);
  });

  it('returns true for a complete scan', () => {
    const profile = makeFailedRiskProfile();
    profile.scanStatus = 'complete';
    profile.scanFailedReason = undefined;
    expect(isVerdictTrustworthy(profile)).toBe(true);
  });

  it('treats a legacy profile with no scanStatus as trustworthy (complete)', () => {
    const profile = makeFailedRiskProfile();
    delete profile.scanStatus;
    delete profile.scanFailedReason;
    expect(isVerdictTrustworthy(profile)).toBe(true);
  });
});
