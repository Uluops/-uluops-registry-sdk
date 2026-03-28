/**
 * Tests for authentication strategies
 */

import { describe, it, expect, vi } from 'vitest';
import {
  ApiKeyAuth,
  JwtSessionAuth,
  createAuthStrategy,
} from '../src/http/auth-strategy.js';
import type { FetchClient } from '../src/http/fetch-adapter.js';
import { ValidationError } from '../src/errors/errors.js';
import { TEST_API_KEY, TEST_SESSION_TOKEN } from './setup.js';

/**
 * Create a mock FetchClient for testing
 */
function createMockFetchClient(): FetchClient {
  return {
    post: vi.fn().mockResolvedValue({
      data: {
        data: {
          sessionToken: 'new-token-from-login',
          expiresAt: '2027-03-01T00:00:00.000Z',
        },
      },
    }),
  };
}

describe('ApiKeyAuth', () => {
  it('should create with valid API key', () => {
    const auth = new ApiKeyAuth(TEST_API_KEY);
    expect(auth.getType()).toBe('api_key');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('should return Bearer authorization header', () => {
    const auth = new ApiKeyAuth(TEST_API_KEY);
    expect(auth.getAuthorizationHeader()).toBe(`Bearer ${TEST_API_KEY}`);
  });

  it('should not support refresh', () => {
    const auth = new ApiKeyAuth(TEST_API_KEY);
    expect(auth.canRefresh()).toBe(false);
  });

  it('should throw on refresh attempt', async () => {
    const auth = new ApiKeyAuth(TEST_API_KEY);
    await expect(auth.refresh()).rejects.toThrow('API keys cannot be refreshed');
  });

  describe('validation', () => {
    it('should throw ValidationError on empty key', () => {
      expect(() => new ApiKeyAuth('')).toThrow(ValidationError);
      expect(() => new ApiKeyAuth('')).toThrow('API key is required');
    });

    it('should throw ValidationError on missing ulr_ prefix', () => {
      expect(() => new ApiKeyAuth('invalid_key_1234567890')).toThrow(ValidationError);
      expect(() => new ApiKeyAuth('invalid_key_1234567890')).toThrow('Expected prefix: ulr_');
    });

    it('should throw ValidationError on key too short', () => {
      expect(() => new ApiKeyAuth('ulr_short')).toThrow(ValidationError);
      expect(() => new ApiKeyAuth('ulr_short')).toThrow('Key too short');
    });

    it('should throw ValidationError on invalid characters', () => {
      expect(() => new ApiKeyAuth('ulr_invalid!key@#$%^&*1234567890')).toThrow(ValidationError);
      expect(() => new ApiKeyAuth('ulr_invalid!key@#$%^&*1234567890')).toThrow('invalid characters');
    });

    it('should include field details in validation errors', () => {
      try {
        new ApiKeyAuth('');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).details).toEqual({ field: 'apiKey' });
      }
    });

    it('should accept key at minimum length', () => {
      const key = 'ulr_' + 'a'.repeat(16); // 20 chars total
      const auth = new ApiKeyAuth(key);
      expect(auth.isAuthenticated()).toBe(true);
    });

    it('should accept key with valid chars (alphanumeric, underscore, hyphen)', () => {
      const auth = new ApiKeyAuth('ulr_test-key_ABC123_xyz');
      expect(auth.isAuthenticated()).toBe(true);
    });
  });
});

describe('JwtSessionAuth', () => {
  it('should create with initial token', () => {
    const httpClient = createMockFetchClient();
    const auth = new JwtSessionAuth(httpClient, { email: 'test@test.com', password: 'pass' }, undefined, TEST_SESSION_TOKEN);
    expect(auth.getType()).toBe('session');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('should return Bearer authorization header', () => {
    const httpClient = createMockFetchClient();
    const auth = new JwtSessionAuth(httpClient, { email: 'test@test.com', password: 'pass' }, undefined, TEST_SESSION_TOKEN);
    expect(auth.getAuthorizationHeader()).toBe(`Bearer ${TEST_SESSION_TOKEN}`);
  });

  it('should support refresh (can re-login)', () => {
    const httpClient = createMockFetchClient();
    const auth = new JwtSessionAuth(httpClient, { email: 'test@test.com', password: 'pass' });
    expect(auth.canRefresh()).toBe(true);
  });

  it('should return current session token', () => {
    const httpClient = createMockFetchClient();
    const auth = new JwtSessionAuth(httpClient, { email: 'test@test.com', password: 'pass' }, undefined, TEST_SESSION_TOKEN);
    expect(auth.getSessionToken()).toBe(TEST_SESSION_TOKEN);
  });

  it('should return null token when not yet authenticated', () => {
    const httpClient = createMockFetchClient();
    const auth = new JwtSessionAuth(httpClient, { email: 'test@test.com', password: 'pass' });
    expect(auth.getSessionToken()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('should throw UnauthorizedError when getting header without token', () => {
    const httpClient = createMockFetchClient();
    const auth = new JwtSessionAuth(httpClient, { email: 'test@test.com', password: 'pass' });
    expect(() => auth.getAuthorizationHeader()).toThrow('Session expired or not authenticated');
  });

  it('should accept non-JWT session tokens (ops API format)', () => {
    const httpClient = createMockFetchClient();
    const opsToken = '-9M8qDiwnLX5lwOXHooBrsRBH9hy7MmU-889Phbd1Fk';
    const auth = new JwtSessionAuth(httpClient, { email: 'test@test.com', password: 'pass' }, undefined, opsToken);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.getAuthorizationHeader()).toBe(`Bearer ${opsToken}`);
  });

  describe('login', () => {
    it('should login and store token', async () => {
      const httpClient = createMockFetchClient();
      const auth = new JwtSessionAuth(httpClient, { email: 'test@test.com', password: 'pass123' });

      const token = await auth.login();
      expect(token).toBe('new-token-from-login');
      expect(auth.getSessionToken()).toBe('new-token-from-login');
      expect(auth.isAuthenticated()).toBe(true);
      expect(httpClient.post).toHaveBeenCalledWith('/auth/login', { email: 'test@test.com', password: 'pass123' });
    });

    it('should call onTokenRefresh callback on login', async () => {
      const httpClient = createMockFetchClient();
      const callback = vi.fn();
      const auth = new JwtSessionAuth(httpClient, { email: 'test@test.com', password: 'pass123' }, callback);

      await auth.login();
      expect(callback).toHaveBeenCalledWith('new-token-from-login');
    });

    it('should set expiresAt from login response', async () => {
      const httpClient = createMockFetchClient();
      const auth = new JwtSessionAuth(httpClient, { email: 'test@test.com', password: 'pass123' });

      await auth.login();
      expect(auth.getExpiresAt()).toEqual(new Date('2027-03-01T00:00:00.000Z'));
    });

    it('should throw when login response missing sessionToken', async () => {
      const httpClient: FetchClient = {
        post: vi.fn().mockResolvedValue({ data: { data: {} } }),
      };
      const auth = new JwtSessionAuth(httpClient, { email: 'test@test.com', password: 'pass123' });
      await expect(auth.login()).rejects.toThrow('Login response missing sessionToken');
    });
  });

  describe('refresh', () => {
    it('should re-login on refresh', async () => {
      const httpClient = createMockFetchClient();
      const auth = new JwtSessionAuth(httpClient, { email: 'test@test.com', password: 'pass123' });

      await auth.refresh();
      expect(auth.getSessionToken()).toBe('new-token-from-login');
      expect(httpClient.post).toHaveBeenCalledWith('/auth/login', { email: 'test@test.com', password: 'pass123' });
    });
  });

  describe('clearSession', () => {
    it('should clear token and expiration', () => {
      const httpClient = createMockFetchClient();
      const auth = new JwtSessionAuth(httpClient, { email: 'test@test.com', password: 'pass' }, undefined, TEST_SESSION_TOKEN);

      expect(auth.isAuthenticated()).toBe(true);
      auth.clearSession();
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.getSessionToken()).toBeNull();
      expect(auth.getExpiresAt()).toBeNull();
    });
  });

  describe('expiration', () => {
    it('should report not authenticated when token is expired', () => {
      const httpClient = createMockFetchClient();
      const auth = new JwtSessionAuth(httpClient, { email: 'test@test.com', password: 'pass' }, undefined, 'some-token');
      // Force expiration by setting expiresAt to the past
      (auth as unknown as { expiresAt: Date }).expiresAt = new Date('2020-01-01');

      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.getSessionToken()).toBeNull(); // Should clear on expiration check
    });
  });
});

describe('createAuthStrategy', () => {
  it('should create ApiKeyAuth when apiKey provided', () => {
    const strategy = createAuthStrategy({ apiKey: TEST_API_KEY });
    expect(strategy.getType()).toBe('api_key');
  });

  it('should create JwtSessionAuth when sessionToken and httpClient provided', () => {
    const httpClient = createMockFetchClient();
    const strategy = createAuthStrategy({ sessionToken: TEST_SESSION_TOKEN, httpClient });
    expect(strategy.getType()).toBe('session');
  });

  it('should create JwtSessionAuth when email/password and httpClient provided', () => {
    const httpClient = createMockFetchClient();
    const strategy = createAuthStrategy({ email: 'test@test.com', password: 'pass', httpClient });
    expect(strategy.getType()).toBe('session');
  });

  it('should prefer apiKey over sessionToken', () => {
    const httpClient = createMockFetchClient();
    const strategy = createAuthStrategy({
      apiKey: TEST_API_KEY,
      sessionToken: TEST_SESSION_TOKEN,
      httpClient,
    });
    expect(strategy.getType()).toBe('api_key');
  });

  it('should prefer apiKey over email/password', () => {
    const httpClient = createMockFetchClient();
    const strategy = createAuthStrategy({
      apiKey: TEST_API_KEY,
      email: 'test@test.com',
      password: 'pass',
      httpClient,
    });
    expect(strategy.getType()).toBe('api_key');
  });

  it('should throw when no credentials provided', () => {
    expect(() => createAuthStrategy({})).toThrow('No valid credentials provided');
  });

  it('should pass onTokenRefresh to JwtSessionAuth', async () => {
    const httpClient = createMockFetchClient();
    const callback = vi.fn();
    const strategy = createAuthStrategy({
      email: 'test@test.com',
      password: 'pass',
      httpClient,
      onTokenRefresh: callback,
    });
    expect(strategy.getType()).toBe('session');
    // Verify callback is wired by doing a login
    await (strategy as JwtSessionAuth).login();
    expect(callback).toHaveBeenCalledWith('new-token-from-login');
  });
});
