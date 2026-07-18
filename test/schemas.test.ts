/**
 * Tests for Zod schemas — ensures new fields are accepted and validated
 */

import { describe, it, expect } from 'vitest';
import { definitionSchema } from '../src/types/schemas.js';
import { isVerdictTrustworthy, isListVerdictTrustworthy, type RiskProfile } from '../src/types/definitions.js';

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

  describe('deep dimension (deep-error laundering, registry-api 06afd6ad)', () => {
    function makeCompleteProfile(): RiskProfile {
      const profile = makeFailedRiskProfile();
      profile.scanStatus = 'complete';
      profile.scanFailedReason = undefined;
      return profile;
    }

    it('returns false when deep analysis errored (sync-clean is not enough)', () => {
      const profile = makeCompleteProfile();
      profile.deep = {
        version: '0.1.0',
        analyzedAt: '2026-01-01T00:00:00Z',
        findings: [],
        riskLevel: 'none',
        status: 'error',
        errorReason: 'no_json',
      };
      expect(isVerdictTrustworthy(profile)).toBe(false);
    });

    it('returns true for an analyzed deep result (clean or flagged)', () => {
      const profile = makeCompleteProfile();
      profile.deep = {
        version: '0.1.0',
        analyzedAt: '2026-01-01T00:00:00Z',
        findings: [],
        riskLevel: 'none',
        status: 'analyzed',
      };
      expect(isVerdictTrustworthy(profile)).toBe(true);
    });

    it('returns true for deep: null (skipped, pending, or legacy) — no false flip', () => {
      const profile = makeCompleteProfile();
      profile.deep = null;
      expect(isVerdictTrustworthy(profile)).toBe(true);
    });

    it('returns true for a deep result with status absent (legacy row)', () => {
      const profile = makeCompleteProfile();
      profile.deep = {
        version: '0.1.0',
        analyzedAt: '2026-01-01T00:00:00Z',
        findings: [],
        riskLevel: 'none',
      };
      expect(isVerdictTrustworthy(profile)).toBe(true);
    });
  });
});

describe('isListVerdictTrustworthy (list-grain twin)', () => {
  it('does not trust an absent triple (pending, never clean)', () => {
    expect(isListVerdictTrustworthy({})).toBe(false);
  });

  it('does not trust a failed sync scan (sentinel none)', () => {
    expect(isListVerdictTrustworthy({ riskLevel: 'none', scanStatus: 'failed' })).toBe(false);
  });

  it('does not trust an errored deep analysis', () => {
    expect(
      isListVerdictTrustworthy({ riskLevel: 'none', scanStatus: 'complete', deepStatus: 'error' }),
    ).toBe(false);
  });

  it('trusts a complete scan with deep analyzed or absent (skipped/pending)', () => {
    expect(
      isListVerdictTrustworthy({ riskLevel: 'medium', scanStatus: 'complete', deepStatus: 'analyzed' }),
    ).toBe(true);
    expect(isListVerdictTrustworthy({ riskLevel: 'none', scanStatus: 'complete' })).toBe(true);
  });

  it('treats a legacy row (riskLevel present, statuses absent) as complete', () => {
    expect(isListVerdictTrustworthy({ riskLevel: 'none' })).toBe(true);
  });

  it('mirrors the profile predicate on the states both can represent', () => {
    const failed = makeFailedRiskProfile();
    expect(isListVerdictTrustworthy({ riskLevel: 'none', scanStatus: 'failed' })).toBe(
      isVerdictTrustworthy(failed),
    );
    failed.scanStatus = 'complete';
    failed.scanFailedReason = undefined;
    expect(isListVerdictTrustworthy({ riskLevel: 'none', scanStatus: 'complete' })).toBe(
      isVerdictTrustworthy(failed),
    );
  });

  it('ignores analyzerStale — staleness is informational, never an un-trust signal', () => {
    // Completion-trust and currency are separate dimensions by design (mirrors
    // the registry API keeping isVerdictTrustworthy currency-free). A stale
    // verdict is still a real verdict; a current one earns no extra trust.
    const stale = { riskLevel: 'none' as const, scanStatus: 'complete' as const, analyzerStale: true };
    const current = { riskLevel: 'none' as const, scanStatus: 'complete' as const, analyzerStale: false };
    expect(isListVerdictTrustworthy(stale)).toBe(true);
    expect(isListVerdictTrustworthy(current)).toBe(true);
    expect(
      isListVerdictTrustworthy({ riskLevel: 'none', scanStatus: 'failed', analyzerStale: false }),
    ).toBe(false);
  });
});
