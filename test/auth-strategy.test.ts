/**
 * Tests for authentication strategies
 */

import { describe, it, expect, vi } from 'vitest';
import {
  ApiKeyAuth,
  JwtSessionAuth,
  createAuthStrategy,
} from '../src/http/auth-strategy.js';
import { ValidationError } from '../src/errors/errors.js';
import { TEST_API_KEY, TEST_SESSION_TOKEN } from './setup.js';

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
  it('should create with valid JWT token', () => {
    const auth = new JwtSessionAuth(TEST_SESSION_TOKEN);
    expect(auth.getType()).toBe('session');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('should return Bearer authorization header', () => {
    const auth = new JwtSessionAuth(TEST_SESSION_TOKEN);
    expect(auth.getAuthorizationHeader()).toBe(`Bearer ${TEST_SESSION_TOKEN}`);
  });

  it('should not support refresh', () => {
    const auth = new JwtSessionAuth(TEST_SESSION_TOKEN);
    expect(auth.canRefresh()).toBe(false);
  });

  it('should throw on refresh attempt with helpful message', async () => {
    const auth = new JwtSessionAuth(TEST_SESSION_TOKEN);
    await expect(auth.refresh()).rejects.toThrow('re-authenticate with the ops-uluops-api');
  });

  it('should return current session token', () => {
    const auth = new JwtSessionAuth(TEST_SESSION_TOKEN);
    expect(auth.getSessionToken()).toBe(TEST_SESSION_TOKEN);
  });

  describe('validation', () => {
    it('should throw ValidationError on empty token', () => {
      expect(() => new JwtSessionAuth('')).toThrow(ValidationError);
      expect(() => new JwtSessionAuth('')).toThrow('Session token is required');
    });

    it('should throw ValidationError on invalid JWT format (no dots)', () => {
      expect(() => new JwtSessionAuth('not-a-jwt')).toThrow(ValidationError);
      expect(() => new JwtSessionAuth('not-a-jwt')).toThrow('Invalid session token format');
    });

    it('should throw ValidationError on invalid JWT format (one dot)', () => {
      expect(() => new JwtSessionAuth('header.payload')).toThrow(ValidationError);
    });

    it('should throw ValidationError on JWT with invalid characters', () => {
      expect(() => new JwtSessionAuth('header.pay load.sig')).toThrow(ValidationError);
    });

    it('should include field details in validation errors', () => {
      try {
        new JwtSessionAuth('');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).details).toEqual({ field: 'sessionToken' });
      }
    });

    it('should accept minimal valid JWT format', () => {
      const auth = new JwtSessionAuth('a.b.c');
      expect(auth.isAuthenticated()).toBe(true);
    });
  });

  describe('updateToken', () => {
    it('should update to a new valid token', () => {
      const auth = new JwtSessionAuth('aaa.bbb.ccc');
      auth.updateToken('xxx.yyy.zzz');
      expect(auth.getSessionToken()).toBe('xxx.yyy.zzz');
      expect(auth.getAuthorizationHeader()).toBe('Bearer xxx.yyy.zzz');
    });

    it('should throw ValidationError on empty new token', () => {
      const auth = new JwtSessionAuth('aaa.bbb.ccc');
      expect(() => auth.updateToken('')).toThrow(ValidationError);
      expect(() => auth.updateToken('')).toThrow('Session token is required');
    });

    it('should throw ValidationError on invalid format new token', () => {
      const auth = new JwtSessionAuth('aaa.bbb.ccc');
      expect(() => auth.updateToken('invalid')).toThrow(ValidationError);
      expect(() => auth.updateToken('invalid')).toThrow('Invalid session token format');
    });

    it('should call onTokenRefresh callback', () => {
      const callback = vi.fn();
      const auth = new JwtSessionAuth('aaa.bbb.ccc', callback);
      auth.updateToken('xxx.yyy.zzz');
      expect(callback).toHaveBeenCalledWith('xxx.yyy.zzz');
    });

    it('should not fail when no onTokenRefresh callback', () => {
      const auth = new JwtSessionAuth('aaa.bbb.ccc');
      expect(() => auth.updateToken('xxx.yyy.zzz')).not.toThrow();
    });
  });
});

describe('createAuthStrategy', () => {
  it('should create ApiKeyAuth when apiKey provided', () => {
    const strategy = createAuthStrategy({ apiKey: TEST_API_KEY });
    expect(strategy.getType()).toBe('api_key');
  });

  it('should create JwtSessionAuth when sessionToken provided', () => {
    const strategy = createAuthStrategy({ sessionToken: TEST_SESSION_TOKEN });
    expect(strategy.getType()).toBe('session');
  });

  it('should prefer apiKey over sessionToken', () => {
    const strategy = createAuthStrategy({
      apiKey: TEST_API_KEY,
      sessionToken: TEST_SESSION_TOKEN,
    });
    expect(strategy.getType()).toBe('api_key');
  });

  it('should throw when no credentials provided', () => {
    expect(() => createAuthStrategy({})).toThrow('No valid credentials provided');
  });

  it('should pass onTokenRefresh to JwtSessionAuth', () => {
    const callback = vi.fn();
    const strategy = createAuthStrategy({
      sessionToken: TEST_SESSION_TOKEN,
      onTokenRefresh: callback,
    });
    expect(strategy.getType()).toBe('session');
    // Verify callback is wired by updating token
    (strategy as JwtSessionAuth).updateToken('xxx.yyy.zzz');
    expect(callback).toHaveBeenCalledWith('xxx.yyy.zzz');
  });
});
