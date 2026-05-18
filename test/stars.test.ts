/**
 * Tests for star operations
 *
 * Covers getStatus, star, and unstar — URL construction, version handling,
 * idempotent behavior, and response validation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import nock from 'nock';
import { RegistryHttpClient } from '../src/http/http-client.js';
import * as starsOps from '../src/operations/stars.js';
import { TEST_API_KEY, MOCK_BASE_URL } from './setup.js';

describe('stars', () => {
  let http: RegistryHttpClient;

  beforeEach(() => {
    http = new RegistryHttpClient({ apiKey: TEST_API_KEY });
  });

  // ── getStatus ──────────────────────────────────────────────────

  describe('getStatus', () => {
    it('checks star status without version', async () => {
      nock(MOCK_BASE_URL)
        .get('/definitions/agent/code-validator/star/status')
        .reply(200, { data: { starred: true, starCount: 42 } });

      const result = await starsOps.getStatus(http, 'agent', 'code-validator');
      expect(result.starred).toBe(true);
      expect(result.starCount).toBe(42);
    });

    it('checks star status with version', async () => {
      nock(MOCK_BASE_URL)
        .get('/definitions/agent/code-validator@1.0.0/star/status')
        .reply(200, { data: { starred: false, starCount: 10 } });

      const result = await starsOps.getStatus(http, 'agent', 'code-validator', '1.0.0');
      expect(result.starred).toBe(false);
      expect(result.starCount).toBe(10);
    });
  });

  // ── star ────────────────────────────────────────────────────────

  describe('star', () => {
    it('stars a definition without version', async () => {
      nock(MOCK_BASE_URL)
        .post('/definitions/agent/code-validator/star')
        .reply(200, { data: { starred: true, starCount: 43 } });

      const result = await starsOps.star(http, 'agent', 'code-validator');
      expect(result.starred).toBe(true);
      expect(result.starCount).toBe(43);
    });

    it('stars a definition with version', async () => {
      nock(MOCK_BASE_URL)
        .post('/definitions/pipeline/ship@2.0.0/star')
        .reply(200, { data: { starred: true, starCount: 5 } });

      const result = await starsOps.star(http, 'pipeline', 'ship', '2.0.0');
      expect(result.starred).toBe(true);
    });

    it('is idempotent — re-starring returns current count', async () => {
      nock(MOCK_BASE_URL)
        .post('/definitions/agent/code-validator/star')
        .reply(200, { data: { starred: true, starCount: 42 } });

      const result = await starsOps.star(http, 'agent', 'code-validator');
      expect(result.starred).toBe(true);
      expect(result.starCount).toBe(42);
    });
  });

  // ── unstar ─────────────────────────────────────────────────────

  describe('unstar', () => {
    it('unstars a definition', async () => {
      nock(MOCK_BASE_URL)
        .delete('/definitions/agent/code-validator/star')
        .reply(200, { data: { starred: false, starCount: 41 } });

      const result = await starsOps.unstar(http, 'agent', 'code-validator');
      expect(result.starred).toBe(false);
      expect(result.starCount).toBe(41);
    });

    it('unstars a definition with version', async () => {
      nock(MOCK_BASE_URL)
        .delete('/definitions/pipeline/ship@2.0.0/star')
        .reply(200, { data: { starred: false, starCount: 4 } });

      const result = await starsOps.unstar(http, 'pipeline', 'ship', '2.0.0');
      expect(result.starred).toBe(false);
      expect(result.starCount).toBe(4);
    });

    it('is idempotent — unstarring when not starred is a no-op', async () => {
      nock(MOCK_BASE_URL)
        .delete('/definitions/command/commit-push/star')
        .reply(200, { data: { starred: false, starCount: 0 } });

      const result = await starsOps.unstar(http, 'command', 'commit-push');
      expect(result.starred).toBe(false);
      expect(result.starCount).toBe(0);
    });
  });

  // ── input validation ───────────────────────────────────────────

  describe('input validation', () => {
    it('rejects invalid definition type', async () => {
      await expect(
        starsOps.getStatus(http, 'invalid' as never, 'my-agent')
      ).rejects.toThrow('Invalid definition type');
    });

    it('rejects invalid definition name', async () => {
      await expect(
        starsOps.star(http, 'agent', 'MyAgent')
      ).rejects.toThrow('lowercase');
    });
  });
});
