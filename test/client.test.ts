/**
 * Tests for the RegistryClient
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RegistryClient } from '../src/client.js';
import {
  mockEndpoint,
  mockError,
  TEST_API_KEY,
  TEST_SESSION_TOKEN,
  createMockDefinition,
  createMockModel,
  createMockUser,
} from './setup.js';

describe('RegistryClient', () => {
  let client: RegistryClient;

  beforeEach(() => {
    client = new RegistryClient({ apiKey: TEST_API_KEY });
  });

  describe('definitions', () => {
    it('should list definitions', async () => {
      const mockResponse = {
        items: [createMockDefinition()],
        total: 1,
        limit: 50,
        offset: 0,
      };

      mockEndpoint('get', '/definitions', mockResponse);

      const result = await client.definitions.list();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should get a definition by type and name', async () => {
      const mockDef = createMockDefinition();
      mockEndpoint('get', '/definitions/agent/test-agent', mockDef);

      const result = await client.definitions.get('agent', 'test-agent');
      expect(result.name).toBe('test-agent');
      expect(result.type).toBe('agent');
    });

    it('should get a definition with version', async () => {
      const mockDef = createMockDefinition({ version: '1.0.0' });
      mockEndpoint('get', '/definitions/agent/test-agent@1.0.0', mockDef);

      const result = await client.definitions.get('agent', 'test-agent', '1.0.0');
      expect(result.version).toBe('1.0.0');
    });

    it('should create a definition', async () => {
      const mockDef = createMockDefinition();
      mockEndpoint('post', '/definitions/agent/test-agent', mockDef, 201);

      const result = await client.definitions.create('agent', 'test-agent', {
        yaml: 'agent:\n  interface:\n    name: test-agent',
      });
      expect(result.name).toBe('test-agent');
    });

    it('should publish a definition', async () => {
      const mockDef = createMockDefinition({ status: 'published' });
      mockEndpoint('post', '/definitions/agent/test-agent@1.0.0/publish', mockDef);

      const result = await client.definitions.publish('agent', 'test-agent', '1.0.0');
      expect(result.status).toBe('published');
    });
  });

  describe('models', () => {
    it('should list models', async () => {
      const mockResponse = {
        models: [createMockModel()],
        aliases: [],
        total: 1,
      };

      mockEndpoint('get', '/models', mockResponse);

      const result = await client.models.list();
      expect(result.models).toHaveLength(1);
    });

    it('should get a model by provider and id', async () => {
      const mockModel = createMockModel();
      mockEndpoint('get', '/models/anthropic/claude-3-opus', mockModel);

      const result = await client.models.get('anthropic', 'claude-3-opus');
      expect(result.provider).toBe('anthropic');
      expect(result.modelId).toBe('claude-3-opus');
    });

    it('should resolve an alias', async () => {
      const mockResolution = {
        alias: 'opus',
        resolved: true,
        provider: 'anthropic',
        modelId: 'claude-3-opus',
        deprecated: false,
        model: createMockModel(),
      };

      mockEndpoint('get', '/models/resolve/opus', mockResolution);

      const result = await client.models.resolveAlias('opus');
      expect(result.resolved).toBe(true);
      expect(result.provider).toBe('anthropic');
    });
  });

  describe('users', () => {
    it('should get a user by id', async () => {
      const mockUser = createMockUser();
      mockEndpoint('get', '/users/00000000-0000-0000-0000-000000000001', mockUser);

      const result = await client.users.get('00000000-0000-0000-0000-000000000001');
      expect(result.username).toBe('testuser');
    });

    it('should batch lookup users', async () => {
      const mockResponse = {
        '00000000-0000-0000-0000-000000000001': createMockUser(),
      };

      mockEndpoint('post', '/users/batch', mockResponse);

      const result = await client.users.batch(['00000000-0000-0000-0000-000000000001']);
      expect(result['00000000-0000-0000-0000-000000000001']).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle 404 errors', async () => {
      mockError('get', '/definitions/agent/nonexistent', 404, {
        code: 'NOT_FOUND',
        message: 'Definition not found',
      });

      await expect(
        client.definitions.get('agent', 'nonexistent')
      ).rejects.toThrow('Definition not found');
    });

    it('should handle 401 errors', async () => {
      mockError('get', '/definitions', 401, {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });

      await expect(client.definitions.list()).rejects.toThrow('Authentication required');
    });
  });

  describe('authentication helpers', () => {
    let originalHome: string | undefined;

    beforeEach(() => {
      // Use a non-existent HOME to prevent loading stored credentials from disk
      originalHome = process.env.HOME;
      process.env.HOME = '/tmp/__nonexistent_test_home__';
    });

    afterEach(() => {
      if (originalHome !== undefined) {
        process.env.HOME = originalHome;
      } else {
        delete process.env.HOME;
      }
    });

    it('should return true for isAuthenticated when API key is provided', () => {
      const authenticatedClient = new RegistryClient({ apiKey: TEST_API_KEY });
      expect(authenticatedClient.isAuthenticated()).toBe(true);
    });

    it('should return false for isAuthenticated when no credentials provided', () => {
      const unauthenticatedClient = new RegistryClient();
      expect(unauthenticatedClient.isAuthenticated()).toBe(false);
    });

    it('should return api_key for getAuthType when API key is provided', () => {
      const apiKeyClient = new RegistryClient({ apiKey: TEST_API_KEY });
      expect(apiKeyClient.getAuthType()).toBe('api_key');
    });

    it('should return session for getAuthType when session token is provided', () => {
      const sessionClient = new RegistryClient({ sessionToken: TEST_SESSION_TOKEN });
      expect(sessionClient.getAuthType()).toBe('session');
    });

    it('should return null for getAuthType when no credentials provided', () => {
      const unauthenticatedClient = new RegistryClient();
      expect(unauthenticatedClient.getAuthType()).toBeNull();
    });
  });
});
