/**
 * Configuration exports for @uluops/registry-sdk/config
 *
 * Constants are browser-safe. Loader functions (loadCredentials, loadConfig,
 * createClientFromEnvironment, etc.) require Node.js (fs, dotenv).
 */

// --- Constants (browser-safe) ---

/** Resolved base URL for the registry API (production or development based on NODE_ENV) */
export { DEFAULT_BASE_URL } from './constants.js';
/** Request timeout in milliseconds */
export { DEFAULT_TIMEOUT } from './constants.js';
/** Number of retries for transient errors */
export { DEFAULT_RETRY_COUNT } from './constants.js';
/** Maximum YAML size in bytes (150KB) */
export { MAX_YAML_SIZE } from './constants.js';
/** API key prefix for format validation ('ulr_') */
export { API_KEY_PREFIX } from './constants.js';
/** Environment variable names used by the SDK */
export { ENV_VARS } from './constants.js';
/** Paths to global config and credentials files */
export { CONFIG_PATHS } from './constants.js';
/** HTTP status code constants for programmatic error checking */
export { HTTP_STATUS } from './constants.js';
/** Status codes eligible for automatic retry */
export { RETRYABLE_STATUS_CODES } from './constants.js';
/** Machine-readable error codes returned by the API */
export { ERROR_CODES } from './constants.js';
/** Current SDK version string */
export { SDK_VERSION } from './constants.js';
/** User-Agent header value sent with every request */
export { USER_AGENT } from './constants.js';

// --- Credential loaders (Node.js only) ---

export {
  loadCredentials,
  loadConfig,
  createClientFromEnvironment,
  isApiKey,
  validateCredentials,
  getGlobalConfigDir,
  getCredentialsPath,
  loadStoredCredentials,
  loadEnvFiles,
  type Credentials,
  type SdkConfig,
} from './loaders.js';
