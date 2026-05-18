/**
 * Configuration and credential loading for the Registry SDK
 *
 * Thin wrapper over @uluops/sdk-core loaders, passing registry-sdk ENV_VARS.
 */

import {
  loadConfig as coreLoadConfig,
  loadCredentials as coreLoadCredentials,
  type EnvVarConfig,
  type SdkConfig as CoreSdkConfig,
} from '@uluops/sdk-core/config';

export {
  getGlobalConfigDir,
  getCredentialsPath,
  loadEnvFiles,
  loadStoredCredentials,
  isApiKey,
  validateCredentials,
  type Credentials,
} from '@uluops/sdk-core/config';

import { RegistryClient, type RegistryClientConfig } from '../client.js';
import { ENV_VARS, DEFAULT_BASE_URL, DEFAULT_AUTH_BASE_URL } from './constants.js';

/**
 * Full SDK configuration for the registry-sdk.
 * authBaseUrl is required (not optional) because the registry API
 * delegates auth to the ops API.
 */
export interface SdkConfig {
  baseUrl: string;
  authBaseUrl: string;
  credentials: import('@uluops/sdk-core/config').Credentials;
  debug: boolean;
  timeout?: number;
  retries?: number;
}

/**
 * Registry-sdk ENV_VARS mapping for sdk-core
 */
const REGISTRY_ENV_VARS: EnvVarConfig = {
  apiKey: ENV_VARS.API_KEY,
  email: ENV_VARS.EMAIL,
  password: ENV_VARS.PASSWORD,
  sessionToken: ENV_VARS.SESSION_TOKEN,
  baseUrl: ENV_VARS.BASE_URL,
  authBaseUrl: ENV_VARS.AUTH_BASE_URL,
  debug: ENV_VARS.DEBUG,
};

/**
 * Load credentials with priority chain.
 * Priority: explicit params > env vars > stored credentials (~/.uluops/credentials.json).
 *
 * @example
 * ```typescript
 * const creds = loadCredentials(); // auto-discover from env/disk
 * const creds = loadCredentials({ apiKey: 'ulr_...' }); // explicit override
 * console.log(creds.apiKey ?? creds.sessionToken); // whichever was found
 * ```
 */
export function loadCredentials(options: {
  apiKey?: string;
  email?: string;
  password?: string;
  sessionToken?: string;
  profile?: string;
} = {}): import('@uluops/sdk-core/config').Credentials {
  return coreLoadCredentials({ ...options, envVars: REGISTRY_ENV_VARS });
}

/**
 * Load full SDK configuration from env vars, .env files, and stored credentials.
 * Returns a complete config object ready for `new RegistryClient()`.
 *
 * @example
 * ```typescript
 * const config = loadConfig(); // auto-discover everything
 * const config = loadConfig({ debug: true, timeout: 60000 }); // with overrides
 * // config.credentials.apiKey, config.baseUrl, config.authBaseUrl, etc.
 * ```
 */
export function loadConfig(options: {
  apiKey?: string;
  email?: string;
  password?: string;
  sessionToken?: string;
  baseUrl?: string;
  authBaseUrl?: string;
  profile?: string;
  debug?: boolean;
  timeout?: number;
  retries?: number;
} = {}): SdkConfig {
  const coreConfig: CoreSdkConfig = coreLoadConfig({
    ...options,
    envVars: REGISTRY_ENV_VARS,
    defaults: {
      baseUrl: DEFAULT_BASE_URL,
      authBaseUrl: DEFAULT_AUTH_BASE_URL,
    },
  });

  return {
    baseUrl: coreConfig.baseUrl,
    authBaseUrl: coreConfig.authBaseUrl ?? DEFAULT_AUTH_BASE_URL,
    credentials: coreConfig.credentials,
    debug: coreConfig.debug,
    timeout: coreConfig.timeout,
    retries: coreConfig.retries,
  };
}

/**
 * Create a RegistryClient with auto-discovery of config from environment
 * variables, .env files, and stored credentials (~/.uluops/credentials.json).
 *
 * This is the Node.js-only equivalent of `new RegistryClient(config)`.
 * The constructor itself is browser-safe (no file/env loading), while
 * this function handles the Node.js-specific config discovery.
 *
 * @example
 * ```typescript
 * import { createClientFromEnvironment } from '@uluops/registry-sdk/config';
 *
 * // Auto-discover credentials from env vars / disk
 * const client = createClientFromEnvironment();
 *
 * // Auto-discover with overrides
 * const client = createClientFromEnvironment({ debug: true });
 * ```
 */
export function createClientFromEnvironment(config: RegistryClientConfig = {}): RegistryClient {
  const sdkConfig = loadConfig({
    apiKey: config.apiKey,
    email: config.email,
    password: config.password,
    sessionToken: config.sessionToken,
    baseUrl: config.baseUrl,
    authBaseUrl: config.authBaseUrl,
    debug: config.debug,
    timeout: config.timeout,
    retries: config.retries,
  });

  // Resolve orgSlug: explicit config > env var
  const orgSlug = config.orgSlug ?? process.env[ENV_VARS.ORG_SLUG] ?? undefined;

  return new RegistryClient({
    baseUrl: sdkConfig.baseUrl,
    authBaseUrl: sdkConfig.authBaseUrl,
    timeout: sdkConfig.timeout,
    retries: sdkConfig.retries,
    debug: sdkConfig.debug,
    apiKey: sdkConfig.credentials.apiKey,
    email: sdkConfig.credentials.email,
    password: sdkConfig.credentials.password,
    sessionToken: sdkConfig.credentials.sessionToken,
    orgSlug,
    onTokenRefresh: config.onTokenRefresh,
  });
}
