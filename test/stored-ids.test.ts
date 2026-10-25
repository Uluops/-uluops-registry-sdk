/**
 * Stored ids are not all RFC 9562 UUIDs; every schema that carries one must accept them.
 *
 * Why this file exists (zod-4 release train close-out, 0.64.1): zod 4's `.uuid()` requires an
 * RFC version nibble (1-8) and variant (8/9/a/b); zod 3's accepted any 8-4-4-4-12 hex. The
 * production census of 2026-10-25 (read-only, BIN_TO_UUID(id, 1)) found stored ids that fail
 * zod 4's check, including two users and 1,313 of 2,767 definition lineage ids. registry-api,
 * platform 2.0.0 and the MCP servers moved every id site to `z.guid()`, zod 4's spelling of zod
 * 3's `.uuid()`. This SDK kept 13 `.uuid()` sites, so a valid response carrying such an id (a
 * definition, a fork summary's `authorId`, a dependency node) failed to parse.
 *
 * Negative control: on 0.64.0 (`.uuid()` kept) the census and every "reads" case fail. The
 * "still rejects" cases keep `z.guid()` from being mistaken for "accept any string".
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { definitionSchema } from '../src/types/schemas.js';
import { definitionListItemSchema, versionListItemSchema, forkSummarySchema, forkSchema } from '../src/types/response-schemas.js';
import { createMockDefinition, createMockDefinitionListItem, createMockVersionListItem } from './contract-helpers.js';

/** Version nibble 0, RFC variant: the shape of the production `system` org id. */
const VERSION_ZERO = '5e0c1a2b-3c4d-0e5f-8a6b-7c8d9e0f1a2b';
/** Version 0 and variant 0: the shape of hand-written seed ids. */
const NON_RFC = 'aaaa0000-0000-0000-0000-000000000001';

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const sources = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? sources(path) : path.endsWith('.ts') ? [path] : [];
});

describe('id census: no RFC-strict uuid() in src', () => {
  const files = sources(SRC);
  const count = (re: RegExp) => files.reduce((n, f) => n + (readFileSync(f, 'utf8').match(re)?.length ?? 0), 0);
  it('walks the source tree (the census is not vacuous)', () => {
    expect(files.length).toBeGreaterThan(10);
    expect(count(/z\.guid\(\)/g)).toBeGreaterThan(0);
  });
  it('has no .uuid() call', () => expect(count(/\.uuid\(/g)).toBe(0));
});

describe.each([
  ['version-0 id (system org shape)', VERSION_ZERO],
  ['non-RFC seed id', NON_RFC],
])('stored %s', (_label, id) => {
  it('reads a definition (id, forkedFromId)', () => {
    const d = definitionSchema.parse({ ...createMockDefinition(), id, forkedFromId: id });
    expect([d.id, d.forkedFromId]).toEqual([id, id]);
  });
  it('reads a list item and a version list item', () => {
    expect(definitionListItemSchema.parse({ ...createMockDefinitionListItem(), id }).id).toBe(id);
    expect(versionListItemSchema.parse({ ...createMockVersionListItem(), id }).id).toBe(id);
  });
  it('reads a fork and a fork summary whose author has this id', () => {
    const f = forkSchema.parse({ id, definitionId: id, sourceDefinitionId: id, forkedAt: '2026-10-25T00:00:00.000Z' });
    expect([f.id, f.definitionId, f.sourceDefinitionId]).toEqual([id, id, id]);
    const s = forkSummarySchema.parse({ id, type: 'agent', name: 'a', version: '1.0.0', authorId: id, orgId: null });
    expect(s.authorId).toBe(id);
  });
});

describe('still rejects what was never an id', () => {
  it.each(['not-a-uuid', '5e0c1a2b3c4d0e5f8a6b7c8d9e0f1a2b', ''])('%j', bad => {
    expect(definitionListItemSchema.safeParse({ ...createMockDefinitionListItem(), id: bad }).success).toBe(false);
  });
});
