/**
 * Tests for configuration loading functions
 *
 * Pure re-exports (isApiKey, validateCredentials) are tested with real implementations.
 *
 * Functions with fs/os dependencies (getGlobalConfigDir, getCredentialsPath,
 * loadStoredCredentials) and wrapper functions (loadCredentials, loadConfig)
 * mock the sdk-core functions directly to avoid unreliable deep-mocking of
 * dotenv/fs/os inside the sdk-core package boundary.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ENV_VARS,
  DEFAULT_BASE_URL,
  DEFAULT_AUTH_BASE_URL,
} from '../src/config/constants.js';

// Mock sdk-core functions at the correct boundary.
// vi.hoisted ensures mock references are available inside vi.mock factories.
const {
  mockCoreLoadCredentials,
  mockCoreLoadConfig,
  mockGetGlobalConfigDir,
  mockGetCredentialsPath,
  mockLoadStoredCredentials,
} = vi.hoisted(() => ({
  mockCoreLoadCredentials: vi.fn(),
  mockCoreLoadConfig: vi.fn(),
  mockGetGlobalConfigDir: vi.fn(),
  mockGetCredentialsPath: vi.fn(),
  mockLoadStoredCredentials: vi.fn(),
}));

vi.mock('@uluops/sdk-core/config', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    loadCredentials: mockCoreLoadCredentials,
    loadConfig: mockCoreLoadConfig,
    getGlobalConfigDir: mockGetGlobalConfigDir,
    getCredentialsPath: mockGetCredentialsPath,
    loadStoredCredentials: mockLoadStoredCredentials,
  };
});

import {
  loadCredentials,
  loadConfig,
  loadStoredCredentials,
  isApiKey,
  validateCredentials,
  getGlobalConfigDir,
  getCredentialsPath,
} from '../src/config/loaders.js';

describe('loaders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGlobalConfigDir', () => {
    it('should delegate to sdk-core getGlobalConfigDir', () => {
      mockGetGlobalConfigDir.mockReturnValue('/home/testuser/.uluops');

      const dir = getGlobalConfigDir();
      expect(dir).toBe('/home/testuser/.uluops');
    });
  });

  describe('getCredentialsPath', () => {
    it('should delegate to sdk-core getCredentialsPath', () => {
      mockGetCredentialsPath.mockReturnValue('/home/testuser/.uluops/credentials.json');

      const path = getCredentialsPath();
      expect(path).toBe('/home/testuser/.uluops/credentials.json');
    });
  });

  describe('isApiKey', () => {
    it('should return true for valid API key prefix', () => {
      // sdk-core >=0.13.0: isApiKey enforces the 20-char minimum (matches the
      // ApiKeyAuth constructor), so the key must be long enough.
      expect(isApiKey('ulr_test_key_1234567890')).toBe(true);
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
      expect(() => validateCredentials({})).toThrow('ULUOPS_API_KEY');
    });
  });

  describe('loadStoredCredentials', () => {
    it('should delegate to sdk-core loadStoredCredentials', () => {
      mockLoadStoredCredentials.mockReturnValue({ apiKey: 'ulr_stored_key' });

      const result = loadStoredCredentials();
      expect(result?.apiKey).toBe('ulr_stored_key');
    });

    it('should pass profile argument through', () => {
      mockLoadStoredCredentials.mockReturnValue({ apiKey: 'ulr_staging' });

      const result = loadStoredCredentials('staging');
      expect(result?.apiKey).toBe('ulr_staging');
      expect(mockLoadStoredCredentials).toHaveBeenCalledWith('staging');
    });

    it('should return null when sdk-core returns null', () => {
      mockLoadStoredCredentials.mockReturnValue(null);

      const result = loadStoredCredentials();
      expect(result).toBeNull();
    });

    it('should return session credentials from sdk-core', () => {
      mockLoadStoredCredentials.mockReturnValue({ sessionToken: 'jwt-token' });

      const result = loadStoredCredentials();
      expect(result?.sessionToken).toBe('jwt-token');
    });
  });

  describe('loadCredentials', () => {
    it('should pass REGISTRY_ENV_VARS to coreLoadCredentials', () => {
      mockCoreLoadCredentials.mockReturnValue({});

      loadCredentials();

      expect(mockCoreLoadCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          envVars: expect.objectContaining({
            apiKey: ENV_VARS.API_KEY,
            email: ENV_VARS.EMAIL,
            password: ENV_VARS.PASSWORD,
            sessionToken: ENV_VARS.SESSION_TOKEN,
            baseUrl: ENV_VARS.BASE_URL,
            debug: ENV_VARS.DEBUG,
          }),
        })
      );
    });

    it('should pass explicit apiKey to coreLoadCredentials', () => {
      mockCoreLoadCredentials.mockReturnValue({ apiKey: 'ulr_explicit_key' });

      const result = loadCredentials({ apiKey: 'ulr_explicit_key' });

      expect(mockCoreLoadCredentials).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: 'ulr_explicit_key' })
      );
      expect(result.apiKey).toBe('ulr_explicit_key');
    });

    it('should pass explicit sessionToken to coreLoadCredentials', () => {
      mockCoreLoadCredentials.mockReturnValue({ sessionToken: 'explicit-session' });

      const result = loadCredentials({ sessionToken: 'explicit-session' });

      expect(mockCoreLoadCredentials).toHaveBeenCalledWith(
        expect.objectContaining({ sessionToken: 'explicit-session' })
      );
      expect(result.sessionToken).toBe('explicit-session');
    });

    it('should pass profile to coreLoadCredentials', () => {
      mockCoreLoadCredentials.mockReturnValue({ apiKey: 'ulr_staging' });

      const result = loadCredentials({ profile: 'staging' });

      expect(mockCoreLoadCredentials).toHaveBeenCalledWith(
        expect.objectContaining({ profile: 'staging' })
      );
      expect(result.apiKey).toBe('ulr_staging');
    });

    it('should return API key credentials from coreLoadCredentials', () => {
      mockCoreLoadCredentials.mockReturnValue({ apiKey: 'ulr_env_key' });

      const result = loadCredentials();

      expect(result).toEqual({ apiKey: 'ulr_env_key' });
    });

    it('should return session credentials from coreLoadCredentials', () => {
      mockCoreLoadCredentials.mockReturnValue({ sessionToken: 'env-session' });

      const result = loadCredentials();

      expect(result).toEqual({ sessionToken: 'env-session' });
    });

    it('should return empty object when no credentials found', () => {
      mockCoreLoadCredentials.mockReturnValue({});

      const result = loadCredentials();

      expect(result).toEqual({});
    });
  });

  describe('loadConfig', () => {
    it('should pass envVars and defaults to coreLoadConfig', () => {
      mockCoreLoadConfig.mockReturnValue({
        baseUrl: DEFAULT_BASE_URL,
        authBaseUrl: DEFAULT_AUTH_BASE_URL,
        credentials: {},
        debug: false,
      });

      loadConfig();

      expect(mockCoreLoadConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          envVars: expect.objectContaining({
            apiKey: ENV_VARS.API_KEY,
          }),
          defaults: expect.objectContaining({
            baseUrl: DEFAULT_BASE_URL,
            authBaseUrl: DEFAULT_AUTH_BASE_URL,
          }),
        })
      );
    });

    it('should use explicit baseUrl when provided', () => {
      mockCoreLoadConfig.mockReturnValue({
        baseUrl: 'https://custom.api.com',
        credentials: {},
        debug: false,
      });

      const config = loadConfig({ baseUrl: 'https://custom.api.com' });

      expect(config.baseUrl).toBe('https://custom.api.com');
      expect(mockCoreLoadConfig).toHaveBeenCalledWith(
        expect.objectContaining({ baseUrl: 'https://custom.api.com' })
      );
    });

    it('should use DEFAULT_BASE_URL from coreLoadConfig result', () => {
      mockCoreLoadConfig.mockReturnValue({
        baseUrl: DEFAULT_BASE_URL,
        credentials: {},
        debug: false,
      });

      const config = loadConfig();

      expect(config.baseUrl).toBe(DEFAULT_BASE_URL);
    });

    it('should set debug to true when explicitly provided', () => {
      mockCoreLoadConfig.mockReturnValue({
        baseUrl: DEFAULT_BASE_URL,
        credentials: {},
        debug: true,
      });

      const config = loadConfig({ debug: true });

      expect(config.debug).toBe(true);
    });

    it('should set debug to false from coreLoadConfig result', () => {
      mockCoreLoadConfig.mockReturnValue({
        baseUrl: DEFAULT_BASE_URL,
        credentials: {},
        debug: false,
      });

      const config = loadConfig();

      expect(config.debug).toBe(false);
    });

    it('should include timeout when provided', () => {
      mockCoreLoadConfig.mockReturnValue({
        baseUrl: DEFAULT_BASE_URL,
        credentials: {},
        debug: false,
        timeout: 5000,
      });

      const config = loadConfig({ timeout: 5000 });

      expect(config.timeout).toBe(5000);
    });

    it('should include retries when provided', () => {
      mockCoreLoadConfig.mockReturnValue({
        baseUrl: DEFAULT_BASE_URL,
        credentials: {},
        debug: false,
        retries: 5,
      });

      const config = loadConfig({ retries: 5 });

      expect(config.retries).toBe(5);
    });

    it('should load credentials with profile', () => {
      mockCoreLoadConfig.mockReturnValue({
        baseUrl: DEFAULT_BASE_URL,
        credentials: { apiKey: 'ulr_staging_key' },
        debug: false,
      });

      const config = loadConfig({ profile: 'staging' });

      expect(mockCoreLoadConfig).toHaveBeenCalledWith(
        expect.objectContaining({ profile: 'staging' })
      );
      expect(config.credentials.apiKey).toBe('ulr_staging_key');
    });

    it('should use DEFAULT_AUTH_BASE_URL when not in coreLoadConfig result', () => {
      mockCoreLoadConfig.mockReturnValue({
        baseUrl: DEFAULT_BASE_URL,
        credentials: {},
        debug: false,
      });

      const config = loadConfig();

      expect(config.authBaseUrl).toBe(DEFAULT_AUTH_BASE_URL);
    });

    it('should use authBaseUrl from coreLoadConfig when present', () => {
      mockCoreLoadConfig.mockReturnValue({
        baseUrl: DEFAULT_BASE_URL,
        authBaseUrl: 'https://custom-auth.api.com',
        credentials: {},
        debug: false,
      });

      const config = loadConfig();

      expect(config.authBaseUrl).toBe('https://custom-auth.api.com');
    });
  });
});
