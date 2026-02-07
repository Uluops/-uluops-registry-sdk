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
 * Load credentials with priority chain
 * Priority: explicit params > env vars > stored credentials
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
 * Load full SDK configuration
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
