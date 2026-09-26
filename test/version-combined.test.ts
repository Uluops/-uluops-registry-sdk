import { describe, it, expect } from 'vitest';
import nock from 'nock';
import { RegistryHttpClient } from '../src/http/http-client.js';
import { diff } from '../src/operations/versions.js';
import { TEST_API_KEY, MOCK_BASE_URL } from './setup.js';

const base = {
  fromVersion: '1.0.0', toVersion: '2.0.0', fromHash: 'old', toHash: 'new', hasChanges: true,
  fromPromptHash: null, toPromptHash: null, hasPromptChanges: false,
  unified: 'patch\n', fromLineCount: 1, toLineCount: 1,
};
const path = '/definitions/agent/example/diff';
const options = { diffContract: 'combined-v1', format: 'unified' } as const;
const client = () => new RegistryHttpClient({ apiKey: TEST_API_KEY, maxRetries: 0 });
const capability = () => nock(MOCK_BASE_URL).get('/capabilities').reply(200, { data: { contracts: { diff: ['combined-v1'] } } });

describe('combined-v1 version diff', () => {
  it.each([false, true])('preserves selected contract and exact content (full=%s)', async (full) => {
    capability();
    const response = { ...base, ...options, full, ...(full && { sourceYaml: 'old\r\n', targetYaml: 'new 🌺' }) };
    nock(MOCK_BASE_URL).get(path).query({ from: '1.0.0', to: '2.0.0', ...options, ...(full && { full: 'true' }) }).reply(200, { data: response });
    expect(await diff(client(), 'agent', 'example', '1.0.0', '2.0.0', { ...options, full })).toEqual(response);
  });
  it.each([404, 200])('refuses missing capability (%s)', async (status) => {
    nock(MOCK_BASE_URL).get('/capabilities').reply(status, status === 200 ? { data: { contracts: {} } } : {});
    await expect(diff(client(), 'agent', 'example', '1.0.0', '2.0.0', options)).rejects.toMatchObject({ code: 'UNSUPPORTED_DIFF_CONTRACT' });
  });
  it('preserves auth refusal', async () => {
    nock(MOCK_BASE_URL).get('/capabilities').reply(403, { error: { message: 'denied' } });
    await expect(diff(client(), 'agent', 'example', '1.0.0', '2.0.0', options)).rejects.toMatchObject({ statusCode: 403 });
  });
  it('refuses legacy response from a server claiming support', async () => {
    capability();
    nock(MOCK_BASE_URL).get(path).query(true).reply(200, { data: base });
    await expect(diff(client(), 'agent', 'example', '1.0.0', '2.0.0', options)).rejects.toMatchObject({ code: 'UNSUPPORTED_DIFF_CONTRACT' });
  });
  it('requires raw bytes when full=true', async () => {
    capability();
    nock(MOCK_BASE_URL).get(path).query(true).reply(200, { data: { ...base, ...options, full: true } });
    await expect(diff(client(), 'agent', 'example', '1.0.0', '2.0.0', { ...options, full: true })).rejects.toMatchObject({ code: 'RESPONSE_VALIDATION' });
  });
  it('rejects a full response mismatch', async () => {
    capability();
    nock(MOCK_BASE_URL).get(path).query(true).reply(200, { data: { ...base, ...options, full: false } });
    await expect(diff(client(), 'agent', 'example', '1.0.0', '2.0.0', { ...options, full: true })).rejects.toMatchObject({ code: 'UNSUPPORTED_DIFF_CONTRACT' });
  });
  it('rejects non-unified selection before transport', async () => {
    await expect(diff(client(), 'agent', 'example', '1.0.0', '2.0.0', { diffContract: 'combined-v1' })).rejects.toMatchObject({ statusCode: 400 });
  });
  it('does not reuse capabilities across operations', async () => {
    const http = client();
    capability();
    nock(MOCK_BASE_URL).get(path).query(true).reply(200, { data: { ...base, ...options, full: false } });
    await diff(http, 'agent', 'example', '1.0.0', '2.0.0', options);
    nock(MOCK_BASE_URL).get('/capabilities').reply(200, { data: { contracts: { diff: [] } } });
    await expect(diff(http, 'agent', 'example', '1.0.0', '2.0.0', options)).rejects.toMatchObject({ code: 'UNSUPPORTED_DIFF_CONTRACT' });
  });
  it('keeps legacy full precedence without capability discovery', async () => {
    const { unified, fromLineCount, toLineCount, ...legacyBase } = base;
    const legacy = { ...legacyBase, fromYaml: 'old', toYaml: 'new' };
    nock(MOCK_BASE_URL).get(path).query({ from: '1.0.0', to: '2.0.0', full: 'true', format: 'unified' }).reply(200, { data: legacy });
    expect(await diff(client(), 'agent', 'example', '1.0.0', '2.0.0', { full: true, format: 'unified' })).toEqual(legacy);
  });
});
