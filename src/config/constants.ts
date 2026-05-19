/**
 * Configuration constants for the Registry SDK
 *
 * Shared constants are re-exported from @uluops/sdk-core.
 * SDK-specific constants remain here.
 */

// Re-export shared constants from sdk-core (sub-path avoids pulling in loaders.js + node:fs)
export {
  DEFAULT_TIMEOUT,
  DEFAULT_RETRY_COUNT,
  API_KEY_PREFIX,
  CONFIG_PATHS,
  HTTP_STATUS,
  ERROR_CODES,
  RETRYABLE_STATUS_CODES,
} from '@uluops/sdk-core/config/constants';

// --- SDK-specific constants ---

/**
 * Production base URL for the registry API
 */
export const DEFAULT_PROD_URL = 'https://api.uluops.ai/api/v1/registry';

/**
 * Development base URL for local registry API
 */
export const DEFAULT_DEV_URL = 'http://localhost:3001/api/v1';

/**
 * Resolve the default base URL based on NODE_ENV.
 * - NODE_ENV=development -> localhost
 * - Otherwise (production, test, undefined) -> production
 */
export const DEFAULT_BASE_URL =
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') ? DEFAULT_DEV_URL : DEFAULT_PROD_URL;

/**
 * Production auth base URL (ops API) for login/refresh.
 * The registry API has no auth endpoints -- it delegates to ops-uluops-api.
 */
export const DEFAULT_AUTH_PROD_URL = 'https://api.uluops.ai/api/v1/ops';

/**
 * Development auth base URL (local ops API).
 */
export const DEFAULT_AUTH_DEV_URL = 'http://localhost:3100/api/v1';

export const DEFAULT_AUTH_BASE_URL =
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') ? DEFAULT_AUTH_DEV_URL : DEFAULT_AUTH_PROD_URL;

/**
 * Maximum YAML size in bytes (150KB)
 */
export const MAX_YAML_SIZE = 153600;

/**
 * Environment variable names
 */
export const ENV_VARS = {
  API_KEY: 'ULUOPS_API_KEY',
  EMAIL: 'ULUOPS_EMAIL',
  PASSWORD: 'ULUOPS_PASSWORD',
  SESSION_TOKEN: 'ULUOPS_SESSION_TOKEN',
  BASE_URL: 'ULUOPS_REGISTRY_URL',
  AUTH_BASE_URL: 'ULUOPS_AUTH_URL',
  ORG_SLUG: 'ULUOPS_ORG_SLUG',
  DEBUG: 'ULUOPS_DEBUG',
} as const;

/**
 * SDK version
 *
 * Hardcoded instead of reading package.json via createRequire(node:module)
 * so this module can be imported in browser environments.
 * Keep in sync with package.json "version" field.
 */
export const SDK_VERSION = '0.21.5';

/**
 * User agent string for requests
 */
export const USER_AGENT = `@uluops/registry-sdk/${SDK_VERSION}`;
