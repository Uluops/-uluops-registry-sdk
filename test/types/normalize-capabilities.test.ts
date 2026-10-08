import { describe, it, expectTypeOf } from 'vitest';
import { normalizeCapabilities } from '../../src/operations/models.js';

/**
 * Type-level: `normalizeCapabilities` must accept a caps type that declares NEITHER name. Its first
 * constraint (`T extends { reasoning?; extendedThinking? }`) was a TypeScript weak type and rejected
 * `{ vision: boolean }` with TS2559 — invisible, because only test/types is type-checked
 * (code-auditor, 0.61.0 review). Checked by `npm run typecheck:types`, not by vitest.
 */
describe('normalizeCapabilities types', () => {
  it('accepts a caps type declaring neither name, and adds both as optional', () => {
    const caps: { vision: boolean } = { vision: true };
    const out = normalizeCapabilities(caps);
    expectTypeOf(out.vision).toEqualTypeOf<boolean>();
    expectTypeOf(out.reasoning).toEqualTypeOf<boolean | undefined>();
    expectTypeOf(out.extendedThinking).toEqualTypeOf<boolean | undefined>();
  });
});
