import { describe, expect, it } from 'vitest';
import nock from 'nock';
import { RegistryHttpClient } from '../src/http/http-client.js';
import { list } from '../src/operations/definitions.js';
import type { ListDefinitionsQuery } from '../src/types/definitions.js';
import { UnsupportedDefinitionSearchContractError } from '../src/errors/index.js';
import { createMockDefinitionListItem } from './contract-helpers.js';
import { TEST_API_KEY, MOCK_BASE_URL } from './setup.js';

const client = () => new RegistryHttpClient({ apiKey: TEST_API_KEY, retries: 0 });
const response = { definitions: [createMockDefinitionListItem({ relevance: 1.25 })], total: 1, limit: 50, offset: 0 };
const capability = () => nock(MOCK_BASE_URL).get('/capabilities').reply(200, { data: { contracts: { definitionSearch: ['name-v1'] } } });

describe('name-v1 definition search', () => {
  it.each(['exact', 'prefix', undefined] as const)('forwards literal normalized identifiers (%s)', async (match) => {
    capability();
    nock(MOCK_BASE_URL).get('/definitions').query({ name: "a%_\\'b", ...(match ? { match } : {}), tag: 'security' }).reply(200, { data: response });
    expect(await list(client(), { name: " A%_\\'B ", match, tag: ['security'] })).toEqual(response);
  });
  it('negotiates explicit text while preserving keyword bytes', async () => {
    capability();
    nock(MOCK_BASE_URL).get('/definitions').query({ search: ' Validate! ', match: 'text' }).reply(200, { data: response });
    expect(await list(client(), { search: ' Validate! ', match: 'text' })).toEqual(response);
  });
  it('preserves legacy search without capability negotiation and old rows without relevance', async () => {
    const legacy = { ...response, definitions: [createMockDefinitionListItem()] };
    nock(MOCK_BASE_URL).get('/definitions').query({ search: 'ab' }).reply(200, { data: legacy });
    expect(await list(client(), { search: 'ab' })).toEqual(legacy);
  });
  it.each([
    { name: '\nprobe' }, { name: 'probe\n' }, { name: ' '.repeat(100) + 'a' }, { name: '' }, { name: '   ' }, { name: 'é' }, { name: 'a\nb' }, { name: 'a'.repeat(101) },
    { name: 'test', search: '' }, { name: 'test', match: 'text' }, { match: 'exact' }, { match: 'prefix' },
    { match: 'text', search: '\nprobe' }, { match: 'text', search: 'probe\n' }, { match: 'text', search: ' '.repeat(100) + 'a' }, { match: 'text', search: 'é' }, { match: 'text' }, { match: 'text', search: ' ' }, { match: 'future', search: 'test' },
  ])('rejects invalid selection before transport: %j', async (query) => {
    await expect(list(client(), query as ListDefinitionsQuery)).rejects.toMatchObject({ statusCode: 400 });
  });
  it.each([{}, { contracts: {} }, { contracts: { definitionSearch: [] } }, { contracts: { definitionSearch: 'name-v1' } }, { contracts: { definitionSearch: ['name-v1', 1] } }])('rejects absent/malformed support without list request: %j', async (data) => {
    nock(MOCK_BASE_URL).get('/capabilities').reply(200, { data });
    await expect(list(client(), { name: 'test' })).rejects.toBeInstanceOf(UnsupportedDefinitionSearchContractError);
  });
  it('converts old capability 404 without falling back', async () => {
    nock(MOCK_BASE_URL).get('/capabilities').reply(404, {});
    await expect(list(client(), { name: 'test' })).rejects.toBeInstanceOf(UnsupportedDefinitionSearchContractError);
  });
  it.each([401, 403, 503])('preserves capability failure status %s', async (status) => {
    nock(MOCK_BASE_URL).get('/capabilities').reply(status, { error: { message: 'refused' } });
    await expect(list(client(), { name: 'test' })).rejects.toMatchObject({ statusCode: status });
  });
  it('preserves capability transport failures', async () => {
    nock(MOCK_BASE_URL).get('/capabilities').replyWithError('network failed');
    await expect(list(client(), { name: 'test' })).rejects.toMatchObject({ message: 'network failed' });
  });
  it('does not cache capability support across operations', async () => {
    const http = client();
    capability();
    nock(MOCK_BASE_URL).get('/definitions').query({ name: 'test' }).reply(200, { data: response });
    await list(http, { name: 'test' });
    nock(MOCK_BASE_URL).get('/capabilities').reply(200, { data: { contracts: { definitionSearch: [] } } });
    await expect(list(http, { name: 'test' })).rejects.toBeInstanceOf(UnsupportedDefinitionSearchContractError);
  });
});
