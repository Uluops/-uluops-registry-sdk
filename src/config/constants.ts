/**
 * Configuration constants for the Registry SDK
 *
 * Shared constants are re-exported from @uluops/sdk-core.
 * SDK-specific constants remain here.
 */

import { createRequire } from 'node:module';

// Re-export shared constants from sdk-core
export {
  DEFAULT_TIMEOUT,
  DEFAULT_RETRY_COUNT,
  BACKOFF_BASE_MS,
  MAX_BACKOFF_MS,
  JITTER_MIN,
  JITTER_MAX,
  API_KEY_PREFIX,
  CONFIG_PATHS,
  HTTP_STATUS,
  ERROR_CODES,
  RETRYABLE_STATUS_CODES,
} from '@uluops/sdk-core/config';

// --- SDK-specific constants ---

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

/**
 * Production base URL for the registry API
 */
export const DEFAULT_PROD_URL = 'https://registry.uluops.ai/api/v1';

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
  process.env.NODE_ENV === 'development' ? DEFAULT_DEV_URL : DEFAULT_PROD_URL;

/**
 * Default auth base URL (ops API) for login/refresh.
 * The registry API has no auth endpoints -- it delegates to ops-uluops-api.
 */
export const DEFAULT_AUTH_BASE_URL = 'http://localhost:3100/api/v1';

/**
 * Maximum YAML size in bytes (100KB)
 */
export const MAX_YAML_SIZE = 102400;

/**
 * Environment variable names
 */
export const ENV_VARS = {
  API_KEY: 'ULUOPS_API_KEY',
  EMAIL: 'ULUOPS_EMAIL',
  PASSWORD: 'ULUOPS_PASSWORD',
  SESSION_TOKEN: 'ULUOPS_SESSION_TOKEN',
  BASE_URL: 'ULUOPS_REGISTRY_URL',
  AUTH_BASE_URL: 'ULUOPS_BASE_URL',
  DEBUG: 'ULUOPS_DEBUG',
} as const;

/**
 * SDK version -- read from package.json at runtime
 */
export const SDK_VERSION: string = pkg.version;

/**
 * User agent string for requests
 */
export const USER_AGENT = `@uluops/registry-sdk/${SDK_VERSION}`;
