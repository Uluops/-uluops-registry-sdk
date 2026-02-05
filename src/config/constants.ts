/**
 * Configuration constants for the Registry SDK
 */

/**
 * Default base URL for the registry API
 */
export const DEFAULT_BASE_URL = 'http://localhost:3001/api/v1';

/**
 * Production base URL
 */
export const PRODUCTION_BASE_URL = 'https://registry.uluops.dev/api/v1';

/**
 * Default request timeout in milliseconds
 */
export const DEFAULT_TIMEOUT = 30000;

/**
 * Default retry count for transient errors
 */
export const DEFAULT_RETRY_COUNT = 3;

/**
 * Base delay for exponential backoff (in ms)
 */
export const BACKOFF_BASE_MS = 1000;

/**
 * Maximum backoff delay (in ms)
 */
export const MAX_BACKOFF_MS = 30000;

/**
 * Jitter range for backoff calculation (10-20% of delay)
 */
export const JITTER_MIN = 0.1;
export const JITTER_MAX = 0.2;

/**
 * Maximum YAML size in bytes (100KB)
 */
export const MAX_YAML_SIZE = 102400;

/**
 * API key prefix
 */
export const API_KEY_PREFIX = 'ulr_';

/**
 * Environment variable names
 */
export const ENV_VARS = {
  API_KEY: 'ULUOPS_API_KEY',
  SESSION_TOKEN: 'ULUOPS_SESSION_TOKEN',
  BASE_URL: 'ULUOPS_REGISTRY_URL',
  DEBUG: 'ULUOPS_DEBUG',
} as const;

/**
 * Config file paths
 */
export const CONFIG_PATHS = {
  LOCAL_ENV: '.env',
  GLOBAL_DIR: '.uluops',
  GLOBAL_ENV: '.uluops/.env',
  CREDENTIALS: '.uluops/credentials.json',
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Retryable HTTP status codes
 */
export const RETRYABLE_STATUS_CODES = new Set([
  HTTP_STATUS.BAD_GATEWAY,
  HTTP_STATUS.SERVICE_UNAVAILABLE,
  HTTP_STATUS.GATEWAY_TIMEOUT,
  HTTP_STATUS.TOO_MANY_REQUESTS,
]);

/**
 * Error codes matching registry API
 */
export const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  CONFLICT: 'CONFLICT',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN',
} as const;

/**
 * SDK version (should match package.json)
 */
export const SDK_VERSION = '0.1.0';

/**
 * User agent string for requests
 */
export const USER_AGENT = `@uluops/registry-sdk/${SDK_VERSION}`;
