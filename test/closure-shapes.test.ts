/**
 * ADL v1.20 P0c shapes (0.64.0): POST /validate's warnings and closure, /render's and preview's
 * `validation`, `closure` and `publish`, and the definition read's stored `closure`.
 *
 * Two properties, each with its control:
 * - **Survival.** `z.object()` strips unknown keys and returns success, so a field the SDK does not
 *   declare vanishes without an error (the 0.62.0 renderStack defect, tracker 5de033b4). Every test
 *   asserts the surviving VALUE, never only `success`. Control: run this file against the 0.63.0
 *   schemas — the survival tests fail.
 * - **Forward compatibility (S1 V50).** Factory-owned vocabularies (`mode`, `severity`, `code`,
 *   `legacyWording`) and registry-owned finding codes are parsed as strings: a value this pin does
 *   not know must not throw. Control: the same payload through a closed enum throws.
 *
 * Payloads follow registry-api `src/schemas/render/schema.ts` and `src/schemas/validation/schema.ts`
 * on branch `feat/adl-v1_20-p0c` (8389b63).
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validationResultSchema, renderResultSchema } from '../src/types/response-schemas.js';
import { definitionSchema } from '../src/types/schemas.js';

const VALIDATE = {
  valid: false,
  errors: [
    { code: 'UNKNOWN_KEY', message: 'unknown key zq', path: '/agent/zq', severity: 'error', key: 'zq', suggestion: 'did you mean …' },
    // Whole-document errors carry no path (registry validation/index.ts PAYLOAD_TOO_LARGE, INVALID_ENCODING).
    { code: 'INVALID_ENCODING', message: 'YAML content contains null bytes', severity: 'error' },
  ],
  warnings: [
    { code: 'UNRENDERED_KEY', message: 'accepted but not rendered', path: '/agent/output/format', severity: 'warning' },
    { code: 'UNKNOWN_FAILURE_MODE', message: 'demoted', path: '/agent/x', severity: 'warning', demotedFrom: 'error' },
  ],
  schemaVersion: '1.19.0',
  validatedAt: '2026-10-24T12:00:00.000Z',
  closure: { mode: 'warn', demoted: 0 },
};

const VALIDATION = {
  mode: 'legacy',
  schemaVersion: '1.19.0',
  valid: true,
  demoted: 2,
  groups: [{
    code: 'UNKNOWN_FAILURE_MODE', severity: 'warning', key: null, count: 12,
    paths: Array.from({ length: 10 }, (_, i) => `/agent/f/${i}`), pathsTruncated: true,
    message: 'outside taxonomy 1.1.0', demotedFrom: 'error',
  }],
};

const CLOSURE = { mode: 'legacy', demoted: 2, legacyWording: 'some-errors' };

const PUBLISH = {
  publishable: false,
  errors: [{ code: 'UNKNOWN_KEY', message: 'm', path: '/agent/zq', severity: 'error', source: 'schema' }],
  warnings: [],
  dependencyBlockers: [{
    code: 'DEPENDENCY_NOT_PUBLISHED', reason: 'unpublished', severity: 'error', dependencyClass: 'requires',
    ref: { type: 'agent', name: 'code-validator', version: '2.0.0' }, paths: ['/command/agent'], context: null,
    target: { version: '2.0.0', status: 'draft' }, message: 'not published',
  }],
  dependencyWarnings: [],
};

describe('POST /validate (validationResultSchema)', () => {
  it('keeps warnings, closure, schemaVersion and the new diagnostic fields', () => {
    const out = validationResultSchema.parse(VALIDATE);
    expect(out.warnings?.map(w => w.code)).toEqual(['UNRENDERED_KEY', 'UNKNOWN_FAILURE_MODE']);
    expect(out.warnings?.[1]?.demotedFrom).toBe('error');
    expect(out.errors?.[0]?.key).toBe('zq');
    expect(out.errors?.[0]?.suggestion).toBe('did you mean …');
    expect(out.closure).toEqual({ mode: 'warn', demoted: 0 });
    expect(out.schemaVersion).toBe('1.19.0');
  });

  it('parses an error with no path instead of throwing', () => {
    const out = validationResultSchema.parse(VALIDATE);
    expect(out.errors?.[1]).toEqual({ code: 'INVALID_ENCODING', message: 'YAML content contains null bytes', severity: 'error' });
  });
});

describe('/render and preview (renderResultSchema)', () => {
  const base = { markdown: '# x', promptHash: 'h' };

  it('keeps validation, closure and publish', () => {
    const out = renderResultSchema.parse({ ...base, validation: VALIDATION, closure: CLOSURE, publish: PUBLISH });
    expect(out.validation).toEqual(VALIDATION);
    expect(out.closure).toEqual(CLOSURE);
    expect(out.publish).toEqual(PUBLISH);
  });

  it('a render without them (CDL, older server) still parses', () => {
    const out = renderResultSchema.parse(base);
    expect(out.validation).toBeUndefined();
    expect(out.closure).toBeUndefined();
  });

  it('legacyWording null (no stamp) is kept as null', () => {
    expect(renderResultSchema.parse({ ...base, closure: { mode: 'warn', demoted: 0, legacyWording: null } }).closure?.legacyWording).toBeNull();
  });
});

describe('definition read (definitionSchema.closure)', () => {
  const def = {
    id: '00000000-0000-4000-8000-000000000001', type: 'agent', name: 'a', version: '1.0.0', status: 'published',
    hash: 'h', displayName: 'A', description: 'd', domain: 'software', authorId: 'u', tier: 'user', visibility: 'public',
    executionCount: 0, uniqueExecutionCount: 0, forkCount: 0, starCount: 0, createdAt: '2026-10-24', updatedAt: '2026-10-24',
  };

  it('keeps the stored qualifier, and null before P0c', () => {
    expect(definitionSchema.parse({ ...def, closure: CLOSURE }).closure).toEqual(CLOSURE);
    expect(definitionSchema.parse({ ...def, closure: null }).closure).toBeNull();
  });
});

describe('forward compatibility (S1 V50)', () => {
  const FUTURE = {
    validate: { ...VALIDATE, closure: { mode: 'future', demoted: 0 }, warnings: [{ code: 'NEW_CODE', message: 'm', path: '/a', severity: 'notice', source: 'lint', demotedFrom: 'warning' }] },
    render: {
      markdown: '# x',
      validation: { ...VALIDATION, mode: 'future', groups: [{ ...VALIDATION.groups[0], code: 'NEW_CODE', severity: 'notice', demotedFrom: 'warning' }] },
      closure: { mode: 'future', demoted: 0, legacyWording: 'new-kind' },
      publish: { ...PUBLISH, dependencyBlockers: [{ ...PUBLISH.dependencyBlockers[0], code: 'DEPENDENCY_FUTURE', reason: 'future', severity: 'fatal', dependencyClass: 'suggests' }] },
    },
  };

  it('unknown mode, severity, code, legacyWording and finding vocabularies parse and survive', () => {
    const v = validationResultSchema.parse(FUTURE.validate);
    expect(v.closure?.mode).toBe('future');
    expect(v.warnings?.[0]).toMatchObject({ code: 'NEW_CODE', severity: 'notice', source: 'lint', demotedFrom: 'warning' });

    const r = renderResultSchema.parse(FUTURE.render);
    expect(r.validation?.mode).toBe('future');
    expect(r.validation?.groups[0]).toMatchObject({ code: 'NEW_CODE', severity: 'notice' });
    expect(r.closure?.legacyWording).toBe('new-kind');
    expect(r.publish?.dependencyBlockers[0]).toMatchObject({ code: 'DEPENDENCY_FUTURE', severity: 'fatal', dependencyClass: 'suggests' });
  });

  it('control: a closed enum on any of those fields throws on the same values', () => {
    expect(() => z.enum(['error', 'warn', 'legacy']).parse(FUTURE.render.closure.mode)).toThrow();
    expect(() => z.enum(['unknown-keys', 'some-errors']).parse(FUTURE.render.closure.legacyWording)).toThrow();
    expect(() => z.enum(['error', 'warning', 'info']).parse(FUTURE.validate.warnings[0].severity)).toThrow();
  });

  it('shape is still enforced: a wrong type throws', () => {
    expect(() => renderResultSchema.parse({ markdown: '# x', closure: { mode: 'warn', demoted: 'two', legacyWording: null } })).toThrow();
    expect(() => renderResultSchema.parse({ markdown: '# x', validation: { ...VALIDATION, groups: [{ ...VALIDATION.groups[0], paths: '/a' }] } })).toThrow();
  });
});
