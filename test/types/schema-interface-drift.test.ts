import { describe, it, expectTypeOf } from 'vitest';
import type { z } from 'zod';
import {
  forkLineageSchema,
  forkLineageHopSchema,
  versionListItemSchema,
  retranslateResultSchema,
} from '../../src/types/response-schemas.js';
import type { ForkLineage, ForkLineageHop } from '../../src/types/forks.js';
import type { VersionListItem } from '../../src/types/versions.js';
import type { RetranslateResult } from '../../src/operations/translation.js';

/**
 * Drift guard (consumer-validate run #41, dx-validator auto-fail): the Zod
 * response schemas are the wire truth, but several public types are
 * hand-maintained interfaces — and twice now a schema gained fields the
 * interface never did (`VersionListItem.createdByName/provenance` predates
 * this release; `status` and `ForkLineage.chain/depth/root` recurred in it).
 * `tsc` passes silently on that drift because extra properties are
 * structurally compatible with a narrower declared type.
 *
 * KEY-SET EQUALITY is the assertion that structural widening cannot slip
 * past: if a schema gains a field the interface lacks (or vice versa), the
 * key unions differ and this file stops compiling. Add a line here whenever a
 * response schema gets a hand-maintained public twin.
 */
describe('response schema ↔ public type drift guard', () => {
  it('ForkLineage keys match forkLineageSchema', () => {
    expectTypeOf<keyof z.infer<typeof forkLineageSchema>>().toEqualTypeOf<keyof ForkLineage>();
  });

  it('ForkLineageHop keys match forkLineageHopSchema', () => {
    expectTypeOf<keyof z.infer<typeof forkLineageHopSchema>>().toEqualTypeOf<keyof ForkLineageHop>();
  });

  it('VersionListItem keys match versionListItemSchema', () => {
    expectTypeOf<keyof z.infer<typeof versionListItemSchema>>().toEqualTypeOf<keyof VersionListItem>();
  });

  it('control: a z.infer-derived type is drift-proof by construction', () => {
    // RetranslateResult is defined as z.infer of its schema — the pattern that
    // cannot drift. If this line ever fails, the schema import wiring broke.
    expectTypeOf<keyof z.infer<typeof retranslateResultSchema>>().toEqualTypeOf<keyof RetranslateResult>();
  });
});
