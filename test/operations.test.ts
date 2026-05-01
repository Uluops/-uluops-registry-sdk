/**
 * Tests for SDK operations
 * Tests boundary conditions, validation, and behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import nock from 'nock';
import { RegistryHttpClient } from '../src/http/http-client.js';
import * as userOps from '../src/operations/users.js';
import * as definitionOps from '../src/operations/definitions.js';
import * as versionOps from '../src/operations/versions.js';
import * as validationOps from '../src/operations/validation.js';
import * as dependencyOps from '../src/operations/dependencies.js';
import * as forkOps from '../src/operations/forks.js';
import * as executionOps from '../src/operations/executions.js';
import * as translationOps from '../src/operations/translation.js';
import * as modelOps from '../src/operations/models.js';
import * as renderOps from '../src/operations/render.js';
import { TEST_API_KEY, MOCK_BASE_URL, createMockDefinition, createMockModel } from './setup.js';
import { MAX_YAML_SIZE } from '../src/config/constants.js';

describe('operations', () => {
  let http: RegistryHttpClient;

  beforeEach(() => {
    http = new RegistryHttpClient({
      apiKey: TEST_API_KEY,
    });
  });

  describe('users', () => {
    describe('batch', () => {
      it('should return empty object for empty array', async () => {
        const result = await userOps.batch(http, []);
        expect(result).toEqual({});
      });

      it('should accept exactly 100 IDs', async () => {
        const ids = Array.from({ length: 100 }, (_, i) =>
          `${String(i).padStart(8, '0')}-0000-4000-a000-000000000000`
        );

        const mockResponse: Record<string, unknown> = {};
        ids.forEach((id) => {
          mockResponse[id] = { id, username: 'user' };
        });

        nock(MOCK_BASE_URL)
          .post('/users/batch', { ids })
          .reply(200, { data: mockResponse });

        const result = await userOps.batch(http, ids);
        expect(Object.keys(result)).toHaveLength(100);
      });

      it('should reject more than 100 IDs', async () => {
        const ids = Array.from({ length: 101 }, (_, i) =>
          `${String(i).padStart(8, '0')}-0000-4000-a000-000000000000`
        );

        await expect(userOps.batch(http, ids)).rejects.toThrow(
          'Batch lookup supports maximum 100 user IDs (received 101)'
        );
      });

      it('should validate each ID format', async () => {
        const ids = ['valid-uuid-format-here-000000000000', 'invalid-id'];

        await expect(userOps.batch(http, ids)).rejects.toThrow('Invalid UUID format');
      });
    });

    describe('get', () => {
      it('should fetch user by valid UUID', async () => {
        const id = '00000000-0000-4000-a000-000000000001';
        nock(MOCK_BASE_URL)
          .get(`/users/${id}`)
          .reply(200, { data: { id, username: 'testuser' } });

        const result = await userOps.get(http, id);
        expect(result.username).toBe('testuser');
      });

      it('should reject invalid UUID', async () => {
        await expect(userOps.get(http, 'not-a-uuid')).rejects.toThrow(
          'Invalid UUID format'
        );
      });
    });
  });

  describe('definitions', () => {
    describe('list', () => {
      it('should list definitions with filters', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions')
          .query({ type: 'agent', limit: '10' })
          .reply(200, { data: { definitions: [], total: 0, limit: 10, offset: 0 } });

        const result = await definitionOps.list(http, { type: 'agent', limit: 10 });
        expect(result.definitions).toEqual([]);
      });

      it('should list definitions without filters', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions')
          .reply(200, { data: { definitions: [], total: 0, limit: 50, offset: 0 } });

        const result = await definitionOps.list(http);
        expect(result).toHaveProperty('definitions');
        expect(result).toHaveProperty('total', 0);
      });
    });

    describe('get', () => {
      it('should get definition without version', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent')
          .reply(200, { data: createMockDefinition({ name: 'my-agent' }) });

        const result = await definitionOps.get(http, 'agent', 'my-agent');
        expect(result.name).toBe('my-agent');
      });

      it('should get definition with version', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0')
          .reply(200, { data: createMockDefinition({ name: 'my-agent', version: '1.0.0' }) });

        const result = await definitionOps.get(http, 'agent', 'my-agent', '1.0.0');
        expect(result.version).toBe('1.0.0');
      });
    });

    describe('create', () => {
      it('should create definition', async () => {
        nock(MOCK_BASE_URL)
          .post('/definitions/agent/new-agent', { yaml: 'test' })
          .reply(201, { data: createMockDefinition({ name: 'new-agent', status: 'draft' }) });

        const result = await definitionOps.create(http, 'agent', 'new-agent', {
          yaml: 'test',
        });
        expect(result.status).toBe('draft');
      });
    });

    describe('update', () => {
      it('should update definition', async () => {
        nock(MOCK_BASE_URL)
          .put('/definitions/agent/my-agent@1.0.0', { yaml: 'updated' })
          .reply(200, { data: createMockDefinition({ name: 'my-agent', version: '1.0.0' }) });

        const result = await definitionOps.update(http, 'agent', 'my-agent', '1.0.0', {
          yaml: 'updated',
        });
        expect(result.name).toBe('my-agent');
      });
    });

    describe('delete', () => {
      it('should delete definition', async () => {
        nock(MOCK_BASE_URL)
          .delete('/definitions/agent/my-agent@1.0.0')
          .reply(200, { data: null });

        await expect(
          definitionOps.remove(http, 'agent', 'my-agent', '1.0.0')
        ).resolves.not.toThrow();
      });
    });

    describe('publish', () => {
      it('should publish definition', async () => {
        nock(MOCK_BASE_URL)
          .post('/definitions/agent/my-agent@1.0.0/publish')
          .reply(200, { data: createMockDefinition({ name: 'my-agent', version: '1.0.0', status: 'published' }) });

        const result = await definitionOps.publish(http, 'agent', 'my-agent', '1.0.0');
        expect(result.status).toBe('published');
      });
    });

    describe('deprecate', () => {
      it('should deprecate definition', async () => {
        nock(MOCK_BASE_URL)
          .post('/definitions/agent/my-agent@1.0.0/deprecate', {
            reason: 'Superseded',
          })
          .reply(200, { data: createMockDefinition({ name: 'my-agent', version: '1.0.0', status: 'deprecated', deprecatedAt: '2024-06-01T00:00:00Z' }) });

        const result = await definitionOps.deprecate(
          http,
          'agent',
          'my-agent',
          '1.0.0',
          { reason: 'Superseded' }
        );
        expect(result.status).toBe('deprecated');
      });
    });
  });

  describe('versions', () => {
    describe('list', () => {
      it('should list versions', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent/versions')
          .reply(200, {
            data: {
              versions: [
                { id: '00000000-0000-4000-a000-000000000001', version: '1.0.0', hash: 'abc', createdAt: '2026-01-01', createdBy: 'user1' },
                { id: '00000000-0000-4000-a000-000000000002', version: '2.0.0', hash: 'def', createdAt: '2026-01-02', createdBy: 'user1' },
              ],
              total: 2,
              limit: 50,
              offset: 0,
            },
          });

        const result = await versionOps.list(http, 'agent', 'my-agent');
        expect(result.versions).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.limit).toBe(50);
        expect(result.offset).toBe(0);
      });

      it('should pass pagination params', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent/versions')
          .query({ limit: '3', offset: '5' })
          .reply(200, {
            data: {
              versions: [{ id: '00000000-0000-4000-a000-000000000003', version: '3.0.0', hash: 'ghi', createdAt: '2026-01-03', createdBy: 'user1' }],
              total: 10,
              limit: 3,
              offset: 5,
            },
          });

        const result = await versionOps.list(http, 'agent', 'my-agent', { limit: 3, offset: 5 });
        expect(result.versions).toHaveLength(1);
        expect(result.total).toBe(10);
        expect(result.limit).toBe(3);
        expect(result.offset).toBe(5);
      });
    });

    describe('diff', () => {
      it('should diff versions', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent/diff')
          .query({ from: '1.0.0', to: '2.0.0' })
          .reply(200, {
            data: {
              fromVersion: '1.0.0',
              toVersion: '2.0.0',
              fromHash: 'hash1',
              toHash: 'hash2',
              hasChanges: true,
              fromPromptHash: null,
              toPromptHash: null,
              hasPromptChanges: false,
              fromLineCount: 50,
              toLineCount: 55,
              sectionsAdded: [],
              sectionsRemoved: [],
              sectionsModified: ['description'],
              sectionsUnchanged: ['name'],
            },
          });

        const result = await versionOps.diff(
          http,
          'agent',
          'my-agent',
          '1.0.0',
          '2.0.0'
        );
        expect(result.sectionsModified).toContain('description');
      });
    });
  });

  describe('validation', () => {
    describe('validate', () => {
      it('should validate YAML', async () => {
        nock(MOCK_BASE_URL)
          .post('/validate/agent', { yaml: 'valid yaml' })
          .reply(200, { data: { valid: true, errors: [] } });

        const result = await validationOps.validate(http, 'agent', 'valid yaml');
        expect(result.valid).toBe(true);
      });

      it('should return validation errors', async () => {
        nock(MOCK_BASE_URL)
          .post('/validate/agent', { yaml: 'invalid' })
          .reply(200, {
            data: { valid: false, errors: [{ path: '/name', message: 'Missing required field: name' }] },
          });

        const result = await validationOps.validate(http, 'agent', 'invalid');
        expect(result.valid).toBe(false);
        expect(result.errors).toEqual([{ path: '/name', message: 'Missing required field: name' }]);
      });
    });
  });

  describe('dependencies', () => {
    describe('get', () => {
      it('should get dependency graph', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/workflow/my-workflow@1.0.0/dependencies')
          .reply(200, {
            data: {
              nodes: [{ id: '00000000-0000-4000-a000-000000000001', type: 'agent', name: 'dep1', version: '1.0.0', status: 'published' }],
              edges: [],
              cycleDetected: false,
            },
          });

        const result = await dependencyOps.get(
          http,
          'workflow',
          'my-workflow',
          '1.0.0'
        );
        expect(result.nodes).toHaveLength(1);
        expect(result.cycleDetected).toBe(false);
      });

      it('should include maxDepth option', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/workflow/my-workflow@1.0.0/dependencies')
          .query({ maxDepth: '3' })
          .reply(200, {
            data: { nodes: [], edges: [], cycleDetected: false },
          });

        const result = await dependencyOps.get(
          http,
          'workflow',
          'my-workflow',
          '1.0.0',
          { maxDepth: 3 }
        );
        expect(result.nodes).toEqual([]);
        expect(result.cycleDetected).toBe(false);
      });
    });

    describe('getDependents', () => {
      it('should get dependents', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/dependents')
          .reply(200, {
            data: { nodes: [{ id: '00000000-0000-4000-a000-000000000001', type: 'agent', name: 'dep1', version: '1.0.0', status: 'published' }], edges: [], cycleDetected: false },
          });

        const result = await dependencyOps.getDependents(
          http,
          'agent',
          'my-agent',
          '1.0.0'
        );
        expect(result.nodes).toHaveLength(1);
      });
    });
  });

  describe('forks', () => {
    describe('create', () => {
      it('should create fork', async () => {
        nock(MOCK_BASE_URL)
          .post('/definitions/agent/original@1.0.0/fork', { newName: 'forked' })
          .reply(201, {
            data: {
              definition: {
                id: '00000000-0000-4000-a000-000000000002',
                type: 'agent',
                name: 'forked',
                version: '1.0.0',
                status: 'draft',
                hash: 'sha256:forked',
                displayName: 'Forked Agent',
                description: 'A forked agent',
                domain: 'software',
                authorId: '00000000-0000-4000-a000-000000000001',
                tier: 'user',
                visibility: 'private',
                executionCount: 0,
                forkCount: 0,
                starCount: 0,
                forkedFromId: '00000000-0000-4000-a000-000000000001',
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z',
              },
              fork: {
                id: '00000000-0000-4000-a000-000000000003',
                sourceDefinitionId: '00000000-0000-4000-a000-000000000001',
                derivedDefinitionId: '00000000-0000-4000-a000-000000000002',
                sourceVersion: '1.0.0',
                createdAt: '2026-01-01T00:00:00Z',
              },
              source: {
                id: '00000000-0000-4000-a000-000000000001',
                type: 'agent',
                name: 'original',
                version: '1.0.0',
                status: 'published',
                displayName: 'Original Agent',
                description: 'The original agent',
                domain: 'software',
                authorId: '00000000-0000-4000-a000-000000000001',
                tier: 'user',
                visibility: 'public',
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z',
                executionCount: 10,
                forkCount: 1,
                starCount: 0,
              },
            },
          });

        const result = await forkOps.create(http, 'agent', 'original', '1.0.0', {
          newName: 'forked',
        });
        expect(result.definition.name).toBe('forked');
      });
    });

    describe('checkForkable', () => {
      it('should check if forkable', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/forkable')
          .reply(200, { data: { canFork: true } });

        const result = await forkOps.checkForkable(
          http,
          'agent',
          'my-agent',
          '1.0.0'
        );
        expect(result.canFork).toBe(true);
      });
    });

    describe('getLineage', () => {
      it('should get lineage', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/lineage')
          .reply(200, {
            data: {
              current: {
                id: '00000000-0000-4000-a000-000000000001',
                type: 'agent',
                name: 'my-agent',
                version: '1.0.0',
                status: 'published',
                displayName: 'My Agent',
                description: 'A test agent',
                domain: 'software',
                authorId: '00000000-0000-4000-a000-000000000001',
                tier: 'user',
                visibility: 'public',
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z',
                executionCount: 0,
                forkCount: 0,
                starCount: 0,
              },
              chain: [],
            },
          });

        const result = await forkOps.getLineage(http, 'agent', 'my-agent', '1.0.0');
        expect(result.chain).toEqual([]);
      });
    });

    describe('list', () => {
      it('should list forks', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/forks')
          .reply(200, {
            data: {
              items: [
                { id: '00000000-0000-4000-a000-000000000001', type: 'agent', name: 'fork-1', version: '1.0.0', status: 'published', displayName: 'Fork 1', description: 'First fork', domain: 'software', authorId: '00000000-0000-4000-a000-000000000001', tier: 'user', visibility: 'public', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', executionCount: 0, forkCount: 0, starCount: 0 },
                { id: '00000000-0000-4000-a000-000000000002', type: 'agent', name: 'fork-2', version: '1.0.0', status: 'published', displayName: 'Fork 2', description: 'Second fork', domain: 'software', authorId: '00000000-0000-4000-a000-000000000001', tier: 'user', visibility: 'public', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', executionCount: 0, forkCount: 0, starCount: 0 },
              ],
              total: 2,
            },
          });

        const result = await forkOps.list(http, 'agent', 'my-agent', '1.0.0');
        expect(result.items).toHaveLength(2);
      });
    });
  });

  describe('executions', () => {
    describe('record', () => {
      it('should record execution', async () => {
        nock(MOCK_BASE_URL)
          .post('/definitions/agent/my-agent@1.0.0/executions', {
            source: 'sdk',
          })
          .reply(201, {
            data: {
              recorded: true,
              duplicate: false,
              definition: {
                id: '00000000-0000-4000-a000-000000000001',
                type: 'agent',
                name: 'my-agent',
                version: '1.0.0',
              },
              executionCount: 1,
            },
          });

        const result = await executionOps.record(http, 'agent', 'my-agent', '1.0.0', {
          source: 'sdk',
        });
        expect(result.recorded).toBe(true);
        expect(result.duplicate).toBe(false);
        expect(result.executionCount).toBe(1);
      });
    });

    describe('getStats', () => {
      it('should get stats with default window', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/executions')
          .reply(200, { data: { totalCount: 100, recentCount: 25, windowMinutes: 60 } });

        const result = await executionOps.getStats(
          http,
          'agent',
          'my-agent',
          '1.0.0'
        );
        expect(result.totalCount).toBe(100);
        expect(result.recentCount).toBe(25);
      });

      it('should get stats with custom window', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/executions')
          .query({ window: '120' })
          .reply(200, { data: { totalCount: 50, recentCount: 10, windowMinutes: 120 } });

        const result = await executionOps.getStats(
          http,
          'agent',
          'my-agent',
          '1.0.0',
          120
        );
        expect(result.totalCount).toBe(50);
      });
    });
  });

  describe('translation', () => {
    describe('getVersion', () => {
      it('should get translator version', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/translation/version')
          .reply(200, { data: { translatorVersion: '2.0.0', schema: '1.0.0' } });

        const result = await translationOps.getVersion(http);
        expect(result.translatorVersion).toBe('2.0.0');
      });
    });

    describe('retranslate', () => {
      it('should retranslate definition', async () => {
        nock(MOCK_BASE_URL)
          .post('/definitions/agent/my-agent@1.0.0/retranslate')
          .reply(200, { data: createMockDefinition({ translatorVersion: '2.0.0' }) });

        const result = await translationOps.retranslate(
          http,
          'agent',
          'my-agent',
          '1.0.0'
        );
        expect(result.translatorVersion).toBe('2.0.0');
      });

      it('should retranslate with force option', async () => {
        nock(MOCK_BASE_URL)
          .post('/definitions/agent/my-agent@1.0.0/retranslate', { force: true })
          .reply(200, { data: createMockDefinition({ translatorVersion: '2.0.0' }) });

        const result = await translationOps.retranslate(
          http,
          'agent',
          'my-agent',
          '1.0.0',
          { force: true }
        );
        expect(result.translatorVersion).toBe('2.0.0');
      });
    });

    describe('upgrade', () => {
      it('should upgrade legacy definition', async () => {
        nock(MOCK_BASE_URL)
          .post('/definitions/agent/legacy-agent/upgrade', { yaml: 'old format' })
          .reply(200, {
            data: {
              definition: createMockDefinition({ name: 'legacy-agent', translatorVersion: '2.0.0' }),
              version: '2.0.0',
              changes: { translatorVersion: '1.0.0 -> 2.0.0' },
            },
          });

        const result = await translationOps.upgrade(http, 'agent', 'legacy-agent', {
          yaml: 'old format',
        });
        expect(result.version).toBe('2.0.0');
      });
    });
  });

  describe('models', () => {
    describe('list', () => {
      it('should list models', async () => {
        nock(MOCK_BASE_URL)
          .get('/models')
          .reply(200, { data: { models: [], aliases: [], total: 0 } });

        const result = await modelOps.list(http);
        expect(result.models).toEqual([]);
      });

      it('should list models with filters', async () => {
        nock(MOCK_BASE_URL)
          .get('/models')
          .query({ provider: 'anthropic', tier: 'premium' })
          .reply(200, { data: { models: [createMockModel({ provider: 'anthropic' })], aliases: [], total: 1 } });

        const result = await modelOps.list(http, {
          provider: 'anthropic',
          tier: 'premium',
        });
        expect(result.models).toHaveLength(1);
      });
    });

    describe('get', () => {
      it('should get model', async () => {
        nock(MOCK_BASE_URL)
          .get('/models/anthropic/claude-3-opus')
          .reply(200, { data: createMockModel({ provider: 'anthropic', modelId: 'claude-3-opus' }) });

        const result = await modelOps.get(http, 'anthropic', 'claude-3-opus');
        expect(result.provider).toBe('anthropic');
      });
    });

    describe('listProviders', () => {
      it('should list providers', async () => {
        nock(MOCK_BASE_URL)
          .get('/models/providers')
          .reply(200, {
            data: {
              providers: [
                { id: 'anthropic', name: 'anthropic', status: 'active' },
                { id: 'openai', name: 'openai', status: 'active' },
              ],
              total: 2,
            },
          });

        const result = await modelOps.listProviders(http);
        expect(result.providers).toHaveLength(2);
      });
    });

    describe('listAliases', () => {
      it('should list aliases', async () => {
        nock(MOCK_BASE_URL)
          .get('/models/aliases')
          .reply(200, {
            data: {
              aliases: [
                { alias: 'opus', provider: 'anthropic', modelId: 'claude-3-opus' },
                { alias: 'sonnet', provider: 'anthropic', modelId: 'claude-3-sonnet' },
              ],
              total: 2,
            },
          });

        const result = await modelOps.listAliases(http);
        expect(result.aliases).toHaveLength(2);
      });
    });

    describe('resolveAlias', () => {
      it('should resolve alias', async () => {
        nock(MOCK_BASE_URL)
          .get('/models/resolve/opus')
          .reply(200, {
            data: { alias: 'opus', target: 'anthropic/claude-3-opus' },
          });

        const result = await modelOps.resolveAlias(http, 'opus');
        expect(result.alias).toBe('opus');
      });
    });

    describe('sync', () => {
      it('should sync models', async () => {
        nock(MOCK_BASE_URL)
          .post('/models/sync')
          .reply(200, { data: { providersAdded: 1, providersUpdated: 0, modelsAdded: 5, modelsUpdated: 2 } });

        const result = await modelOps.sync(http);
        expect(result.modelsAdded).toBe(5);
      });
    });
  });

  describe('render', () => {
    describe('get', () => {
      it('should get rendered definition', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/render')
          .reply(200, { data: { markdown: '# My Agent' } });

        const result = await renderOps.get(http, 'agent', 'my-agent', '1.0.0');
        expect(result.markdown).toBe('# My Agent');
      });
    });

    describe('preview', () => {
      it('should preview render', async () => {
        nock(MOCK_BASE_URL)
          .post('/render/agent/preview', { yaml: 'test yaml' })
          .reply(200, { data: { markdown: '# Preview' } });

        const result = await renderOps.preview(http, 'agent', { yaml: 'test yaml' });
        expect(result.markdown).toBe('# Preview');
      });

      it('should reject invalid definition type', async () => {
        await expect(
          renderOps.preview(http, 'invalid' as never, { yaml: 'test' })
        ).rejects.toThrow('Invalid definition type');
      });

      it('should reject oversized YAML', async () => {
        const oversizedYaml = 'x'.repeat(MAX_YAML_SIZE + 1);
        await expect(
          renderOps.preview(http, 'agent', { yaml: oversizedYaml })
        ).rejects.toThrow('exceeds maximum size');
      });
    });
  });

  describe('input validation across operations', () => {
    describe('invalid definition type', () => {
      it('should reject invalid type in definitions.get', async () => {
        await expect(
          definitionOps.get(http, 'invalid' as never, 'my-agent')
        ).rejects.toThrow('Invalid definition type');
      });

      it('should reject invalid type in definitions.create', async () => {
        await expect(
          definitionOps.create(http, 'invalid' as never, 'my-agent', { yaml: 'test' })
        ).rejects.toThrow('Invalid definition type');
      });

      it('should reject invalid type in versions.list', async () => {
        await expect(
          versionOps.list(http, 'invalid' as never, 'my-agent')
        ).rejects.toThrow('Invalid definition type');
      });

      it('should reject invalid type in validation.validate', async () => {
        await expect(
          validationOps.validate(http, 'invalid' as never, 'yaml content')
        ).rejects.toThrow('Invalid definition type');
      });
    });

    describe('invalid definition name', () => {
      it('should reject uppercase name', async () => {
        await expect(
          definitionOps.get(http, 'agent', 'MyAgent')
        ).rejects.toThrow('lowercase');
      });

      it('should reject name starting with hyphen', async () => {
        await expect(
          definitionOps.get(http, 'agent', '-my-agent')
        ).rejects.toThrow('Cannot start or end with hyphen');
      });

      it('should reject name ending with hyphen', async () => {
        await expect(
          definitionOps.get(http, 'agent', 'my-agent-')
        ).rejects.toThrow('Cannot start or end with hyphen');
      });

      it('should reject empty name', async () => {
        await expect(
          definitionOps.get(http, 'agent', '')
        ).rejects.toThrow('name is required');
      });
    });

    describe('invalid version format', () => {
      it('should reject partial semver', async () => {
        await expect(
          definitionOps.update(http, 'agent', 'my-agent', '1.0', { yaml: 'test' })
        ).rejects.toThrow('semver');
      });

      it('should reject non-numeric version', async () => {
        await expect(
          definitionOps.publish(http, 'agent', 'my-agent', 'latest')
        ).rejects.toThrow('semver');
      });

      it('should reject version with spaces', async () => {
        await expect(
          definitionOps.publish(http, 'agent', 'my-agent', '1.0 .0')
        ).rejects.toThrow('semver');
      });
    });

    describe('oversized YAML', () => {
      it('should reject oversized YAML in validation.validate', async () => {
        const oversizedYaml = 'x'.repeat(MAX_YAML_SIZE + 1);
        await expect(
          validationOps.validate(http, 'agent', oversizedYaml)
        ).rejects.toThrow('exceeds maximum size');
      });

      it('should accept YAML at exactly MAX_YAML_SIZE', async () => {
        const exactSizeYaml = 'x'.repeat(102400);
        nock(MOCK_BASE_URL)
          .post('/validate/agent')
          .reply(200, { data: { valid: true, errors: [] } });

        const result = await validationOps.validate(http, 'agent', exactSizeYaml);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('forks (additional)', () => {
    describe('list', () => {
      it('should list forks of a definition', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/forks')
          .reply(200, {
            data: {
              items: [
                { id: '00000000-0000-4000-a000-000000000001', type: 'agent', name: 'fork-1', version: '1.0.0', status: 'published', displayName: 'Fork 1', description: 'First fork', domain: 'software', authorId: '00000000-0000-4000-a000-000000000001', tier: 'user', visibility: 'public', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', executionCount: 0, forkCount: 0, starCount: 0 },
                { id: '00000000-0000-4000-a000-000000000002', type: 'agent', name: 'fork-2', version: '1.0.0', status: 'published', displayName: 'Fork 2', description: 'Second fork', domain: 'software', authorId: '00000000-0000-4000-a000-000000000001', tier: 'user', visibility: 'public', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', executionCount: 0, forkCount: 0, starCount: 0 },
              ],
              total: 2,
            },
          });

        const result = await forkOps.list(http, 'agent', 'my-agent', '1.0.0');
        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(2);
      });

      it('should handle empty forks list', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/forks')
          .reply(200, { data: { items: [], total: 0 } });

        const result = await forkOps.list(http, 'agent', 'my-agent', '1.0.0');
        expect(result.items).toEqual([]);
        expect(result.total).toBe(0);
      });

      it('should reject invalid type', async () => {
        await expect(
          forkOps.list(http, 'invalid' as never, 'my-agent', '1.0.0')
        ).rejects.toThrow('Invalid definition type');
      });
    });
  });

  describe('executions (additional)', () => {
    describe('record', () => {
      it('should handle duplicate execution with runId', async () => {
        const runId = '550e8400-e29b-41d4-a716-446655440000';
        nock(MOCK_BASE_URL)
          .post('/definitions/agent/my-agent@1.0.0/executions', {
            source: 'sdk',
            runId,
          })
          .reply(200, {
            data: {
              recorded: false,
              duplicate: true,
              definition: {
                id: '00000000-0000-4000-a000-000000000001',
                type: 'agent',
                name: 'my-agent',
                version: '1.0.0',
              },
              executionCount: 5,
            },
          });

        const result = await executionOps.record(http, 'agent', 'my-agent', '1.0.0', {
          source: 'sdk',
          runId,
        });
        expect(result.recorded).toBe(false);
        expect(result.duplicate).toBe(true);
      });
    });

    describe('getStats', () => {
      it('should pass window=1 (minimum boundary)', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/executions')
          .query({ window: '1' })
          .reply(200, { data: { totalCount: 10, recentCount: 2, windowMinutes: 1 } });

        const result = await executionOps.getStats(http, 'agent', 'my-agent', '1.0.0', 1);
        expect(result.windowMinutes).toBe(1);
      });

      it('should omit window param when undefined', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/executions')
          .reply(200, { data: { totalCount: 10, recentCount: 5, windowMinutes: 60 } });

        const result = await executionOps.getStats(http, 'agent', 'my-agent', '1.0.0');
        expect(result.totalCount).toBe(10);
      });
    });
  });

  describe('versions (additional)', () => {
    describe('diff', () => {
      it('should reject invalid from version', async () => {
        await expect(
          versionOps.diff(http, 'agent', 'my-agent', 'bad', '2.0.0')
        ).rejects.toThrow('semver');
      });

      it('should reject invalid to version', async () => {
        await expect(
          versionOps.diff(http, 'agent', 'my-agent', '1.0.0', 'bad')
        ).rejects.toThrow('semver');
      });
    });
  });

  // ========================================================================
  // Response Validation Error Tests
  // Verify that Zod schema validation is wired and catches malformed responses
  // ========================================================================

  describe('response validation', () => {
    it('definitions.list rejects malformed response', async () => {
      nock(MOCK_BASE_URL).get('/definitions').reply(200, { data: { definitions: 'not-an-array' } });
      await expect(definitionOps.list(http)).rejects.toThrow(/API response validation failed/);
    });

    it('definitions.get rejects response with wrong type for executionCount', async () => {
      nock(MOCK_BASE_URL).get('/definitions/agent/test').reply(200, {
        data: { ...createMockDefinition(), executionCount: 'not-a-number' },
      });
      await expect(definitionOps.get(http, 'agent', 'test')).rejects.toThrow(/API response validation failed/);
    });

    it('versions.list rejects missing versions array', async () => {
      nock(MOCK_BASE_URL).get('/definitions/agent/test/versions').reply(200, {
        data: { total: 0, limit: 20, offset: 0 },
      });
      await expect(versionOps.list(http, 'agent', 'test')).rejects.toThrow(/API response validation failed/);
    });

    it('models.get rejects missing capabilities', async () => {
      nock(MOCK_BASE_URL).get('/models/anthropic/claude-3-opus').reply(200, {
        data: { provider: 'anthropic', modelId: 'claude-3-opus' },
      });
      await expect(modelOps.get(http, 'anthropic', 'claude-3-opus')).rejects.toThrow(/API response validation failed/);
    });

    it('analytics.getEffectiveness rejects missing stale field', async () => {
      nock(MOCK_BASE_URL).get('/analytics/definitions/agent/test/effectiveness').reply(200, {
        data: {
          definition: { type: 'agent', name: 'test', version: '1.0.0' },
          period: { start: '2026-01-01', end: '2026-02-01' },
          metrics: { executionCount: 0, uniqueProjects: 0, uniqueUsers: 0, effectiveness: null, healthScore: null, factorCompleteness: 0, healthFactors: [] },
        },
      });
      await expect(
        (await import('../src/operations/analytics.js')).getEffectiveness(http, 'agent', 'test'),
      ).rejects.toThrow(/API response validation failed/);
    });

    it('render.get rejects missing markdown', async () => {
      nock(MOCK_BASE_URL).get('/definitions/agent/test@1.0.0/render').reply(200, {
        data: { target: 'opencode' },
      });
      await expect(renderOps.get(http, 'agent', 'test', '1.0.0')).rejects.toThrow(/API response validation failed/);
    });

    it('forks.checkForkable rejects wrong type for canFork', async () => {
      nock(MOCK_BASE_URL).get('/definitions/agent/test@1.0.0/forkable').reply(200, {
        data: { canFork: 'yes' },
      });
      await expect(forkOps.checkForkable(http, 'agent', 'test', '1.0.0')).rejects.toThrow(/API response validation failed/);
    });

    it('dependencies.get rejects missing cycleDetected', async () => {
      nock(MOCK_BASE_URL).get('/definitions/agent/test@1.0.0/dependencies').reply(200, {
        data: { nodes: [], edges: [] },
      });
      await expect(dependencyOps.get(http, 'agent', 'test', '1.0.0')).rejects.toThrow(/API response validation failed/);
    });
  });
});
