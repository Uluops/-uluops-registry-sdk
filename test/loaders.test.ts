/**
 * Tests for configuration loading functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import {
  loadCredentials,
  loadConfig,
  loadStoredCredentials,
  isApiKey,
  validateCredentials,
  getGlobalConfigDir,
  getCredentialsPath,
} from '../src/config/loaders.js';
import { ENV_VARS, DEFAULT_BASE_URL, API_KEY_PREFIX } from '../src/config/constants.js';

// Mock fs and os modules
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/home/testuser'),
}));

// Mock dotenv
vi.mock('dotenv', () => ({
  config: vi.fn(),
}));

describe('loaders', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
    delete process.env[ENV_VARS.API_KEY];
    delete process.env[ENV_VARS.SESSION_TOKEN];
    delete process.env[ENV_VARS.BASE_URL];
    delete process.env[ENV_VARS.DEBUG];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getGlobalConfigDir', () => {
    it('should return global config directory path', () => {
      const dir = getGlobalConfigDir();
      expect(dir).toBe('/home/testuser/.uluops');
    });
  });

  describe('getCredentialsPath', () => {
    it('should return credentials file path', () => {
      const path = getCredentialsPath();
      expect(path).toBe('/home/testuser/.uluops/credentials.json');
    });
  });

  describe('isApiKey', () => {
    it('should return true for valid API key prefix', () => {
      expect(isApiKey('ulr_test_key_12345')).toBe(true);
    });

    it('should return false for invalid prefix', () => {
      expect(isApiKey('invalid_key')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isApiKey('')).toBe(false);
    });
  });

  describe('validateCredentials', () => {
    it('should not throw when API key is present', () => {
      expect(() => validateCredentials({ apiKey: 'ulr_test' })).not.toThrow();
    });

    it('should not throw when session token is present', () => {
      expect(() => validateCredentials({ sessionToken: 'jwt-token' })).not.toThrow();
    });

    it('should throw when no credentials are present', () => {
      expect(() => validateCredentials({})).toThrow('No credentials found');
    });

    it('should include environment variable name in error message', () => {
      expect(() => validateCredentials({})).toThrow(ENV_VARS.API_KEY);
    });
  });

  describe('loadStoredCredentials', () => {
    it('should return null when credentials file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = loadStoredCredentials();
      expect(result).toBeNull();
    });

    it('should load API key from default profile', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          default: {
            type: 'api_key',
            apiKey: 'ulr_stored_key',
          },
        })
      );

      const result = loadStoredCredentials();
      expect(result?.apiKey).toBe('ulr_stored_key');
    });

    it('should load session token from default profile', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          default: {
            type: 'session',
            sessionToken: 'jwt-token',
          },
        })
      );

      const result = loadStoredCredentials();
      expect(result?.sessionToken).toBe('jwt-token');
    });

    it('should load credentials from custom profile', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          default: { type: 'api_key', apiKey: 'ulr_default' },
          staging: { type: 'api_key', apiKey: 'ulr_staging' },
        })
      );

      const result = loadStoredCredentials('staging');
      expect(result?.apiKey).toBe('ulr_staging');
    });

    it('should return null for non-existent profile', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          default: { type: 'api_key', apiKey: 'ulr_default' },
        })
      );

      const result = loadStoredCredentials('nonexistent');
      expect(result).toBeNull();
    });

    it('should return null for expired session token', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          default: {
            type: 'session',
            sessionToken: 'expired-token',
            expiresAt: pastDate,
          },
        })
      );

      const result = loadStoredCredentials();
      expect(result).toBeNull();
    });

    it('should return credentials for valid (non-expired) session token', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const futureDate = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          default: {
            type: 'session',
            sessionToken: 'valid-token',
            expiresAt: futureDate,
          },
        })
      );

      const result = loadStoredCredentials();
      expect(result?.sessionToken).toBe('valid-token');
    });

    it('should return null on JSON parse error', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('invalid json');

      const result = loadStoredCredentials();
      expect(result).toBeNull();
    });
  });

  describe('loadCredentials', () => {
    it('should prioritize explicit apiKey over everything', () => {
      process.env[ENV_VARS.API_KEY] = 'ulr_env_key';
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({ default: { type: 'api_key', apiKey: 'ulr_stored_key' } })
      );

      const result = loadCredentials({ apiKey: 'ulr_explicit_key' });
      expect(result.apiKey).toBe('ulr_explicit_key');
    });

    it('should prioritize explicit sessionToken over env vars and stored', () => {
      process.env[ENV_VARS.SESSION_TOKEN] = 'env-session';

      const result = loadCredentials({ sessionToken: 'explicit-session' });
      expect(result.sessionToken).toBe('explicit-session');
    });

    it('should use env API key when no explicit params', () => {
      process.env[ENV_VARS.API_KEY] = 'ulr_env_key';

      const result = loadCredentials();
      expect(result.apiKey).toBe('ulr_env_key');
    });

    it('should use env session token when no explicit params or API key', () => {
      process.env[ENV_VARS.SESSION_TOKEN] = 'env-session';

      const result = loadCredentials();
      expect(result.sessionToken).toBe('env-session');
    });

    it('should prioritize env API key over session token', () => {
      process.env[ENV_VARS.API_KEY] = 'ulr_env_key';
      process.env[ENV_VARS.SESSION_TOKEN] = 'env-session';

      const result = loadCredentials();
      expect(result.apiKey).toBe('ulr_env_key');
      expect(result.sessionToken).toBeUndefined();
    });

    it('should fall back to stored credentials when no env vars', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({ default: { type: 'api_key', apiKey: 'ulr_stored_key' } })
      );

      const result = loadCredentials();
      expect(result.apiKey).toBe('ulr_stored_key');
    });

    it('should return empty object when no credentials found', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = loadCredentials();
      expect(result).toEqual({});
    });
  });

  describe('loadConfig', () => {
    beforeEach(() => {
      vi.mocked(existsSync).mockReturnValue(false);
    });

    it('should use explicit baseUrl when provided', () => {
      const config = loadConfig({ baseUrl: 'https://custom.api.com' });
      expect(config.baseUrl).toBe('https://custom.api.com');
    });

    it('should use env BASE_URL when no explicit value', () => {
      process.env[ENV_VARS.BASE_URL] = 'https://env.api.com';

      const config = loadConfig();
      expect(config.baseUrl).toBe('https://env.api.com');
    });

    it('should use default BASE_URL when nothing provided', () => {
      const config = loadConfig();
      expect(config.baseUrl).toBe(DEFAULT_BASE_URL);
    });

    it('should set debug to true when explicitly provided', () => {
      const config = loadConfig({ debug: true });
      expect(config.debug).toBe(true);
    });

    it('should set debug to true from env var', () => {
      process.env[ENV_VARS.DEBUG] = 'true';

      const config = loadConfig();
      expect(config.debug).toBe(true);
    });

    it('should set debug to false by default', () => {
      const config = loadConfig();
      expect(config.debug).toBe(false);
    });

    it('should include timeout when provided', () => {
      const config = loadConfig({ timeout: 5000 });
      expect(config.timeout).toBe(5000);
    });

    it('should include retries when provided', () => {
      const config = loadConfig({ retries: 5 });
      expect(config.retries).toBe(5);
    });

    it('should load credentials with profile', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          staging: { type: 'api_key', apiKey: 'ulr_staging_key' },
        })
      );

      const config = loadConfig({ profile: 'staging' });
      expect(config.credentials.apiKey).toBe('ulr_staging_key');
    });
  });
});
