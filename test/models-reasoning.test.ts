/**
 * Reasoning capability — wire name vs SDK name (thinking-capability-restore spec v0.7.0 §4.1, T1-T3).
 *
 * The registry serves `capabilities.reasoning`. Until 0.61.0 this SDK declared only
 * `extendedThinking`, so the default strip (ADR-002) dropped `reasoning` and every consumer read
 * `extendedThinking: undefined` — core's thinking gates never fired on any route. These tests parse
 * payloads CAPTURED FROM THE LIVE API (test/fixtures/wire, 2026-10-08), never a fixture built from the
 * SDK's own field list: that self-consistent fixture is how the defect passed review for nine months.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import nock from 'nock';
import { readFileSync } from 'node:fs';
import { RegistryHttpClient } from '../src/http/http-client.js';
import * as modelOps from '../src/operations/models.js';
import { normalizeCapabilities } from '../src/operations/models.js';
import { modelCapabilitiesSchema } from '../src/types/response-schemas.js';
import { createMockModel } from './contract-helpers.js';
import { TEST_API_KEY, MOCK_BASE_URL } from './setup.js';

function wire(name: 'get' | 'list' | 'resolve'): { data: Record<string, unknown> } {
  const file = new URL(`./fixtures/wire/models-${name}.json`, import.meta.url);
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`wire fixture ${file.pathname} unreadable — re-capture it from the live API`, { cause: err });
  }
}

describe('reasoning capability (live wire payloads)', () => {
  let http: RegistryHttpClient;
  beforeEach(() => {
    http = new RegistryHttpClient({ apiKey: TEST_API_KEY });
  });

  it('control: the captured payloads carry `reasoning` and never `extendedThinking`', () => {
    const get = wire('get').data as { capabilities: Record<string, unknown> };
    expect(get.capabilities['reasoning']).toBe(true);
    expect(get.capabilities).not.toHaveProperty('extendedThinking');
  });

  it('T1: models.get keeps reasoning and fills the extendedThinking alias', async () => {
    const payload = wire('get');
    nock(MOCK_BASE_URL).get('/models/anthropic/claude-sonnet-4-5').reply(200, payload);
    const model = await modelOps.get(http, 'anthropic', 'claude-sonnet-4-5');
    expect(model.capabilities.reasoning).toBe(true);
    expect(model.capabilities.extendedThinking).toBe(true);
  });

  it('T2: models.list items keep reasoning, true AND false, with the alias matching', async () => {
    const payload = wire('list');
    nock(MOCK_BASE_URL).get('/models').query(true).reply(200, payload);
    const { models } = await modelOps.list(http, { provider: 'anthropic' });
    const wireCaps = (payload.data['models'] as Array<{ capabilities: { reasoning: boolean } }>).map(m => m.capabilities.reasoning);
    expect(models.length).toBeGreaterThan(0);
    expect(wireCaps).toContain(true);
    expect(wireCaps).toContain(false);
    expect(models.map(m => m.capabilities.reasoning)).toEqual(wireCaps);
    expect(models.map(m => m.capabilities.extendedThinking)).toEqual(wireCaps);
  });

  it('T2b: models.resolveAlias("sonnet") — core\'s default route — keeps reasoning', async () => {
    const payload = wire('resolve');
    nock(MOCK_BASE_URL).get('/models/resolve/sonnet').reply(200, payload);
    const res = await modelOps.resolveAlias(http, 'sonnet');
    expect(res.model).toBeTruthy();
    expect(res.model!.capabilities.reasoning).toBe(true);
    expect(res.model!.capabilities.extendedThinking).toBe(true);
  });

  it('models.get via the /models/lookup path normalises too', async () => {
    const payload = wire('get');
    nock(MOCK_BASE_URL).get('/models/lookup').query(true).reply(200, payload);
    const model = await modelOps.get(http, 'openrouter', 'anthropic/claude-sonnet-4.5');
    expect(model.capabilities.reasoning).toBe(true);
    expect(model.capabilities.extendedThinking).toBe(true);
  });

  it('reverse alias: an API that serves only extendedThinking still yields reasoning', async () => {
    const payload = wire('get');
    const caps = { ...(payload.data['capabilities'] as Record<string, unknown>) };
    delete caps['reasoning'];
    caps['extendedThinking'] = true;
    nock(MOCK_BASE_URL).get('/models/anthropic/claude-sonnet-4-5').reply(200, { data: { ...payload.data, capabilities: caps } });
    const model = await modelOps.get(http, 'anthropic', 'claude-sonnet-4-5');
    expect(model.capabilities.reasoning).toBe(true);
    expect(model.capabilities.extendedThinking).toBe(true);
  });

  it('normalizeCapabilities: absent stays absent; an explicit name wins over its alias', () => {
    expect(normalizeCapabilities({ vision: true })).toEqual({ vision: true });
    expect(normalizeCapabilities({ reasoning: false })).toEqual({ reasoning: false, extendedThinking: false });
    expect(normalizeCapabilities({ reasoning: true, extendedThinking: false }))
      .toEqual({ reasoning: true, extendedThinking: false });
  });

  it('the exported capability schema stays a ZodObject (no .transform — OD-11)', () => {
    expect(Object.keys(modelCapabilitiesSchema.shape)).toContain('reasoning');
    expect(typeof modelCapabilitiesSchema.extend).toBe('function');
    expect(typeof modelCapabilitiesSchema.pick).toBe('function');
  });
});

describe('T3: mock model fixtures use the wire name', () => {
  it('createMockModel capability keys are a subset of the live payload keys', () => {
    const wireKeys = Object.keys((wire('get').data as { capabilities: object }).capabilities);
    const mockKeys = Object.keys(createMockModel().capabilities);
    expect(mockKeys.length).toBeGreaterThan(0);
    expect(mockKeys.filter(k => !wireKeys.includes(k))).toEqual([]);
  });
});
