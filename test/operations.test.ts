/**
 * Tests for SDK operations
 * Tests boundary conditions, validation, and behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import nock from 'nock';
import { ZodError } from 'zod';
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
import { TEST_API_KEY, MOCK_BASE_URL } from './setup.js';
import { createMockDefinition, createMockModel } from './contract-helpers.js';
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
      it('returns { definition, warnings: [] } on a clean publish', async () => {
        nock(MOCK_BASE_URL)
          .post('/definitions/agent/my-agent@1.0.0/publish')
          .reply(200, { data: createMockDefinition({ name: 'my-agent', version: '1.0.0', status: 'published' }) });

        const result = await definitionOps.publish(http, 'agent', 'my-agent', '1.0.0');
        expect(result.definition.status).toBe('published');
        expect(result.warnings).toEqual([]);
      });

      it('surfaces non-fatal warnings on the response', async () => {
        nock(MOCK_BASE_URL)
          .post('/definitions/agent/my-agent@1.0.0/publish')
          .reply(200, {
            data: createMockDefinition({ name: 'my-agent', version: '1.0.0', status: 'published' }),
            warnings: [{
              code: 'TRANSLATION_FAILED',
              message: 'Definition published, but translation failed.',
              details: { error: 'Missing required "agent" key' },
            }],
          });

        const result = await definitionOps.publish(http, 'agent', 'my-agent', '1.0.0');
        expect(result.definition.status).toBe('published');
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]?.code).toBe('TRANSLATION_FAILED');
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

    describe('archive', () => {
      it('should archive a deprecated definition', async () => {
        nock(MOCK_BASE_URL)
          .post('/definitions/agent/my-agent@1.0.0/archive')
          .reply(200, { data: createMockDefinition({ name: 'my-agent', version: '1.0.0', status: 'archived' }) });

        const result = await definitionOps.archive(http, 'agent', 'my-agent', '1.0.0');
        expect(result.name).toBe('my-agent');
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
      const diffBase = {
        fromVersion: '1.0.0',
        toVersion: '2.0.0',
        fromHash: 'hash1',
        toHash: 'hash2',
        hasChanges: true,
        fromPromptHash: null,
        toPromptHash: null,
        hasPromptChanges: false,
      };

      it('should diff versions (default summary format)', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent/diff')
          .query({ from: '1.0.0', to: '2.0.0' })
          .reply(200, {
            data: {
              ...diffBase,
              fromLineCount: 50,
              toLineCount: 55,
              sectionsAdded: [],
              sectionsRemoved: [],
              sectionsModified: ['description'],
              sectionsUnchanged: ['name'],
            },
          });

        const result = await versionOps.diff(http, 'agent', 'my-agent', '1.0.0', '2.0.0');
        expect(result.sectionsModified).toContain('description');
      });

      it('should request full YAML diff with full=true', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent/diff')
          .query({ from: '1.0.0', to: '2.0.0', full: 'true' })
          .reply(200, {
            data: { ...diffBase, fromYaml: 'name: old', toYaml: 'name: new' },
          });

        const result = await versionOps.diff(http, 'agent', 'my-agent', '1.0.0', '2.0.0', { full: true });
        expect(result.fromYaml).toBe('name: old');
        expect(result.toYaml).toBe('name: new');
      });

      it('should request field-level diff with format=fields', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent/diff')
          .query({ from: '1.0.0', to: '2.0.0', format: 'fields' })
          .reply(200, {
            data: {
              ...diffBase,
              fields: [{ path: 'description', type: 'modified', oldValue: 'old', newValue: 'new' }],
              summary: { added: 0, removed: 0, modified: 1, unchanged: 5 },
              sections: { added: [], removed: [], modified: ['description'], unchanged: ['name'] },
              classified: [{ path: 'description', type: 'modified', significance: 'cosmetic', reason: 'text change' }],
              suggestedBump: 'patch',
            },
          });

        const result = await versionOps.diff(http, 'agent', 'my-agent', '1.0.0', '2.0.0', { format: 'fields' });
        expect(result.fields).toHaveLength(1);
        expect(result.fields[0].type).toBe('modified');
        expect(result.suggestedBump).toBe('patch');
      });

      it('should request unified diff with format=unified', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent/diff')
          .query({ from: '1.0.0', to: '2.0.0', format: 'unified' })
          .reply(200, {
            data: { ...diffBase, unified: '--- a\n+++ b\n@@ -1 +1 @@\n-old\n+new', fromLineCount: 1, toLineCount: 1 },
          });

        const result = await versionOps.diff(http, 'agent', 'my-agent', '1.0.0', '2.0.0', { format: 'unified' });
        expect(result.unified).toContain('---');
      });

      it('should not send format param for format=sections (default)', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent/diff')
          .query({ from: '1.0.0', to: '2.0.0' })
          .reply(200, {
            data: {
              ...diffBase,
              fromLineCount: 50,
              toLineCount: 55,
              sectionsAdded: [],
              sectionsRemoved: [],
              sectionsModified: [],
              sectionsUnchanged: ['name'],
            },
          });

        const result = await versionOps.diff(http, 'agent', 'my-agent', '1.0.0', '2.0.0', { format: 'sections' });
        expect(result.sectionsUnchanged).toContain('name');
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
      it('returns the full DependencyGraphResponse envelope', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/workflow/my-workflow@1.0.0/dependencies')
          .reply(200, {
            data: {
              definition: { type: 'workflow', name: 'my-workflow', version: '1.0.0' },
              graph: {
                id: '00000000-0000-4000-a000-000000000001',
                type: 'workflow',
                name: 'my-workflow',
                version: '1.0.0',
                dependencies: [
                  {
                    id: '00000000-0000-4000-a000-000000000002',
                    type: 'agent',
                    name: 'dep1',
                    version: '1.0.0',
                    context: 'invokes.agent',
                    dependencies: [],
                  },
                ],
              },
              flat: [
                { id: '00000000-0000-4000-a000-000000000002', type: 'agent', name: 'dep1', version: '1.0.0', depth: 1 },
              ],
              totalCount: 1,
              maxDepth: 1,
            },
          });

        const result = await dependencyOps.get(
          http,
          'workflow',
          'my-workflow',
          '1.0.0'
        );
        expect(result.definition).toEqual({ type: 'workflow', name: 'my-workflow', version: '1.0.0' });
        expect(result.graph.dependencies).toHaveLength(1);
        expect(result.graph.dependencies[0]?.name).toBe('dep1');
        expect(result.flat).toHaveLength(1);
        expect(result.flat[0]?.depth).toBe(1);
        expect(result.totalCount).toBe(1);
        expect(result.maxDepth).toBe(1);
      });

      it('returns the no-deps envelope (empty graph)', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/workflow/my-workflow@1.0.0/dependencies')
          .query({ maxDepth: '3' })
          .reply(200, {
            data: {
              definition: { type: 'workflow', name: 'my-workflow', version: '1.0.0' },
              graph: {
                id: '00000000-0000-4000-a000-000000000001',
                type: 'workflow',
                name: 'my-workflow',
                version: '1.0.0',
                dependencies: [],
              },
              flat: [],
              totalCount: 0,
              maxDepth: 0,
            },
          });

        const result = await dependencyOps.get(
          http,
          'workflow',
          'my-workflow',
          '1.0.0',
          { maxDepth: 3 }
        );
        expect(result.graph.dependencies).toEqual([]);
        expect(result.flat).toEqual([]);
        expect(result.totalCount).toBe(0);
      });
    });

    describe('getDependents', () => {
      it('returns the full DependentsResponse envelope', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/dependents')
          .reply(200, {
            data: {
              definition: { type: 'agent', name: 'my-agent', version: '1.0.0' },
              dependents: [
                {
                  id: '00000000-0000-4000-a000-000000000001',
                  type: 'workflow',
                  name: 'caller-workflow',
                  version: '1.0.0',
                  context: 'phase validate',
                },
              ],
              totalCount: 1,
            },
          });

        const result = await dependencyOps.getDependents(
          http,
          'agent',
          'my-agent',
          '1.0.0'
        );
        expect(result.definition).toEqual({ type: 'agent', name: 'my-agent', version: '1.0.0' });
        expect(result.dependents).toHaveLength(1);
        expect(result.dependents[0]?.context).toBe('phase validate');
        expect(result.totalCount).toBe(1);
      });

      it('returns the no-dependents envelope (the case the old schema parsed as {})', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/dependents')
          .reply(200, {
            data: {
              definition: { type: 'agent', name: 'my-agent', version: '1.0.0' },
              dependents: [],
              totalCount: 0,
            },
          });

        const result = await dependencyOps.getDependents(
          http,
          'agent',
          'my-agent',
          '1.0.0'
        );
        expect(result.dependents).toEqual([]);
        expect(result.totalCount).toBe(0);
      });
    });
  });

  describe('forks', () => {
    describe('create', () => {
      it('should create fork', async () => {
        nock(MOCK_BASE_URL)
          .post('/definitions/agent/original@1.0.0/fork', { name: 'forked' })
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
                definitionId: '00000000-0000-4000-a000-000000000002',
                sourceDefinitionId: '00000000-0000-4000-a000-000000000001',
                forkedAt: '2026-01-01T00:00:00Z',
              },
              source: {
                id: '00000000-0000-4000-a000-000000000001',
                type: 'agent',
                name: 'original',
                version: '1.0.0',
                authorId: '00000000-0000-4000-a000-000000000001',
                orgId: '00000000-0000-4000-a000-000000000001',
              },
            },
          });

        const result = await forkOps.create(http, 'agent', 'original', '1.0.0', {
          name: 'forked',
        });
        expect(result.definition.name).toBe('forked');
      });
    });

    describe('isForkable', () => {
      it('should check if forkable', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/forkable')
          .reply(200, { data: { canFork: true } });

        const result = await forkOps.isForkable(
          http,
          'agent',
          'my-agent',
          '1.0.0'
        );
        expect(result.canFork).toBe(true);
      });
    });

    describe('getAncestry', () => {
      it('should get ancestry for a fork', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/lineage')
          .reply(200, {
            data: {
              isFork: true,
              fork: {
                id: '00000000-0000-4000-a000-000000000010',
                definitionId: '00000000-0000-4000-a000-000000000001',
                sourceDefinitionId: '00000000-0000-4000-a000-000000000002',
                forkedAt: '2026-01-01T00:00:00Z',
              },
              source: {
                id: '00000000-0000-4000-a000-000000000002',
                type: 'agent',
                name: 'source-agent',
                version: '1.0.0',
                authorId: '00000000-0000-4000-a000-000000000003',
                orgId: '00000000-0000-4000-a000-000000000004',
              },
            },
          });

        const result = await forkOps.getAncestry(http, 'agent', 'my-agent', '1.0.0');
        expect(result.isFork).toBe(true);
        expect(result.fork?.sourceDefinitionId).toBe('00000000-0000-4000-a000-000000000002');
        expect(result.source?.name).toBe('source-agent');
      });

      it('should get ancestry for a non-fork', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/standalone@1.0.0/lineage')
          .reply(200, {
            data: {
              isFork: false,
              fork: null,
              source: null,
            },
          });

        const result = await forkOps.getAncestry(http, 'agent', 'standalone', '1.0.0');
        expect(result.isFork).toBe(false);
        expect(result.fork).toBeNull();
        expect(result.source).toBeNull();
      });
    });

    describe('list', () => {
      it('should list forks', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/forks')
          .reply(200, {
            data: {
              forks: [
                { fork: { id: '00000000-0000-4000-a000-000000000010', definitionId: '00000000-0000-4000-a000-000000000001', sourceDefinitionId: '00000000-0000-4000-a000-000000000099', forkedAt: '2026-01-01T00:00:00Z' }, definition: { id: '00000000-0000-4000-a000-000000000001', type: 'agent', name: 'fork-1', version: '1.0.0', authorId: '00000000-0000-4000-a000-000000000001', orgId: null } },
                { fork: { id: '00000000-0000-4000-a000-000000000011', definitionId: '00000000-0000-4000-a000-000000000002', sourceDefinitionId: '00000000-0000-4000-a000-000000000099', forkedAt: '2026-01-02T00:00:00Z' }, definition: { id: '00000000-0000-4000-a000-000000000002', type: 'agent', name: 'fork-2', version: '1.0.0', authorId: '00000000-0000-4000-a000-000000000001', orgId: null } },
              ],
              totalForks: 2,
            },
          });

        const result = await forkOps.list(http, 'agent', 'my-agent', '1.0.0');
        expect(result.forks).toHaveLength(2);
        expect(result.totalForks).toBe(2);
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

      it('should retranslate with createNewVersion option', async () => {
        nock(MOCK_BASE_URL)
          .post('/definitions/agent/my-agent@1.0.0/retranslate', { createNewVersion: true })
          .reply(200, { data: createMockDefinition({ translatorVersion: '2.0.0' }) });

        const result = await translationOps.retranslate(
          http,
          'agent',
          'my-agent',
          '1.0.0',
          { createNewVersion: true }
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

        const result = await translationOps.upgradeDefinition(http, 'agent', 'legacy-agent', {
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

      it('should pass target query param', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/render')
          .query({ target: 'opencode' })
          .reply(200, { data: { markdown: '# My Agent', target: 'opencode', warnings: [] } });

        const result = await renderOps.get(http, 'agent', 'my-agent', '1.0.0', { target: 'opencode' });
        expect(result.markdown).toBe('# My Agent');
        expect(result.target).toBe('opencode');
      });

      it('should pass model query param with target', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/render')
          .query({ target: 'opencode', model: 'gpt-5.3' })
          .reply(200, { data: { markdown: '# My Agent', target: 'opencode' } });

        const result = await renderOps.get(http, 'agent', 'my-agent', '1.0.0', {
          target: 'opencode',
          model: 'gpt-5.3',
        });
        expect(result.markdown).toBe('# My Agent');
      });

      it('should accept "latest" as version (omits version from path)', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent/render')
          .reply(200, { data: { markdown: '# Latest' } });

        const result = await renderOps.get(http, 'agent', 'my-agent', 'latest');
        expect(result.markdown).toBe('# Latest');
      });

      it('should reject target with invalid characters', async () => {
        await expect(
          renderOps.get(http, 'agent', 'my-agent', '1.0.0', { target: 'has spaces!' })
        ).rejects.toThrow('target contains invalid characters');
      });

      it('should reject target exceeding 100 chars', async () => {
        await expect(
          renderOps.get(http, 'agent', 'my-agent', '1.0.0', { target: 'a'.repeat(101) })
        ).rejects.toThrow('target must be a non-empty string');
      });

      it('should reject model with invalid characters', async () => {
        await expect(
          renderOps.get(http, 'agent', 'my-agent', '1.0.0', { target: 'opencode', model: 'bad model!' })
        ).rejects.toThrow('model contains invalid characters');
      });

      it('should pass renderProfile query param', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/render')
          .query({ renderProfile: 'core' })
          .reply(200, { data: { markdown: '# Core' } });

        const result = await renderOps.get(http, 'agent', 'my-agent', '1.0.0', { renderProfile: 'core' });
        expect(result.markdown).toBe('# Core');
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
        const exactSizeYaml = 'x'.repeat(MAX_YAML_SIZE);
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
      it('should handle empty forks list', async () => {
        nock(MOCK_BASE_URL)
          .get('/definitions/agent/my-agent@1.0.0/forks')
          .reply(200, { data: { forks: [], totalForks: 0 } });

        const result = await forkOps.list(http, 'agent', 'my-agent', '1.0.0');
        expect(result.forks).toEqual([]);
        expect(result.totalForks).toBe(0);
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
      await expect(definitionOps.list(http)).rejects.toThrow(ZodError);
    });

    it('definitions.get rejects response with wrong type for executionCount', async () => {
      nock(MOCK_BASE_URL).get('/definitions/agent/test').reply(200, {
        data: { ...createMockDefinition(), executionCount: 'not-a-number' },
      });
      await expect(definitionOps.get(http, 'agent', 'test')).rejects.toThrow(ZodError);
    });

    it('versions.list rejects missing versions array', async () => {
      nock(MOCK_BASE_URL).get('/definitions/agent/test/versions').reply(200, {
        data: { total: 0, limit: 20, offset: 0 },
      });
      await expect(versionOps.list(http, 'agent', 'test')).rejects.toThrow(ZodError);
    });

    it('models.get rejects missing capabilities', async () => {
      nock(MOCK_BASE_URL).get('/models/anthropic/claude-3-opus').reply(200, {
        data: { provider: 'anthropic', modelId: 'claude-3-opus' },
      });
      await expect(modelOps.get(http, 'anthropic', 'claude-3-opus')).rejects.toThrow(ZodError);
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
      ).rejects.toThrow(ZodError);
    });

    it('render.get rejects missing markdown', async () => {
      nock(MOCK_BASE_URL).get('/definitions/agent/test@1.0.0/render').reply(200, {
        data: { target: 'opencode' },
      });
      await expect(renderOps.get(http, 'agent', 'test', '1.0.0')).rejects.toThrow(ZodError);
    });

    it('forks.isForkable rejects wrong type for canFork', async () => {
      nock(MOCK_BASE_URL).get('/definitions/agent/test@1.0.0/forkable').reply(200, {
        data: { canFork: 'yes' },
      });
      await expect(forkOps.isForkable(http, 'agent', 'test', '1.0.0')).rejects.toThrow(ZodError);
    });

    it('dependencies.get rejects an envelope missing the graph field', async () => {
      nock(MOCK_BASE_URL).get('/definitions/agent/test@1.0.0/dependencies').reply(200, {
        data: {
          definition: { type: 'agent', name: 'test', version: '1.0.0' },
          flat: [],
          totalCount: 0,
          maxDepth: 0,
        },
      });
      await expect(dependencyOps.get(http, 'agent', 'test', '1.0.0')).rejects.toThrow(ZodError);
    });

    it('dependencies.getDependents rejects a bare {} (the pre-R12 degenerate shape)', async () => {
      nock(MOCK_BASE_URL).get('/definitions/agent/test@1.0.0/dependents').reply(200, {
        data: {},
      });
      await expect(dependencyOps.getDependents(http, 'agent', 'test', '1.0.0')).rejects.toThrow(ZodError);
    });

    it('dependencies.get rejects a bare {} (the pre-R12 degenerate shape — post-impl r1)', async () => {
      // Symmetric regression guard with getDependents above. The pre-R12
      // bug affected BOTH operations equally — both parsed any response
      // (including the right envelope) as {} because every field on the
      // old dependencyGraphSchema was optional. Without this test, only
      // half the regression surface is documented at the operation tier.
      nock(MOCK_BASE_URL).get('/definitions/agent/test@1.0.0/dependencies').reply(200, {
        data: {},
      });
      await expect(dependencyOps.get(http, 'agent', 'test', '1.0.0')).rejects.toThrow(ZodError);
    });

    it('dependencies.get throws RangeError when maxDepth exceeds safe ceiling (post-impl r2, CWE-674)', async () => {
      // Pre-parse depth guard against pathological / malicious payloads. The
      // recursive z.lazy schema would walk every nested dependencies[] array
      // synchronously and could exhaust the call stack on a 10,000-deep tree.
      // The guard reads maxDepth from the envelope (a shallow primitive)
      // BEFORE the recursive parse runs and rejects responses above the
      // ceiling. Production graphs run at depth 7 max (live-verified
      // 2026-06-08); the ceiling is 50 (~7× real-world max).
      nock(MOCK_BASE_URL).get('/definitions/agent/test@1.0.0/dependencies').reply(200, {
        data: {
          definition: { type: 'agent', name: 'test', version: '1.0.0' },
          graph: { id: '00000000-0000-4000-a000-000000000001', type: 'agent', name: 'test', version: '1.0.0', dependencies: [] },
          flat: [],
          totalCount: 0,
          maxDepth: 100, // > MAX_SAFE_GRAPH_DEPTH (50)
        },
      });
      await expect(dependencyOps.get(http, 'agent', 'test', '1.0.0')).rejects.toThrow(RangeError);
    });
  });
});
