/**
 * HTTP client for the Registry API
 *
 * Registry-specific HTTP client extending sdk-core's HttpClient
 * with registry defaults (baseUrl, authBaseUrl, extra headers).
 */

import {
  HttpClient,
  type HttpClientConfig as CoreHttpClientConfig,
} from '@uluops/sdk-core/http';
import type { RateLimitInfo } from '@uluops/sdk-core';
import {
  DEFAULT_BASE_URL,
  DEFAULT_AUTH_BASE_URL,
  SDK_VERSION,
} from '../config/constants.js';
import { validateShortString } from '../config/validators.js';

/**
 * HTTP client configuration for the registry SDK
 */
export interface HttpClientConfig {
  /** Registry API base URL (default: https://api.uluops.ai/api/v1/registry) */
  baseUrl?: string;
  /** Auth API base URL for login/refresh (default: https://api.uluops.ai/api/v1/ops) */
  authBaseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Number of retries for transient errors with exponential backoff (default: 3) */
  retries?: number;
  /** Enable debug logging to stderr */
  debug?: boolean;
  /** API key for authentication (starts with 'ulr_') */
  apiKey?: string;
  /** Email for session-based auth */
  email?: string;
  /** Password for session-based auth */
  password?: string;
  /** Pre-existing JWT session token — bypasses login, does not trigger onTokenRefresh */
  sessionToken?: string;
  /** Org slug for multi-tenancy — sets X-Org-Slug header on all requests */
  orgSlug?: string;
  /** Callback invoked when a session token is refreshed — use to persist the new token */
  onTokenRefresh?: (token: string) => void;
  /** Called when rate limit remaining drops below threshold (default: 10%) */
  onRateLimitApproaching?: (info: RateLimitInfo) => void;
  /** Ratio of remaining/limit that triggers the callback (default: 0.1) */
  rateLimitThreshold?: number;
}

/**
 * HTTP client for the registry API using native fetch.
 * Extends the core HttpClient with registry-specific defaults.
 */
export class RegistryHttpClient extends HttpClient {
  constructor(config: HttpClientConfig = {}) {
    if (config.orgSlug) {
      validateShortString(config.orgSlug, 'orgSlug');
    }

    const coreConfig: CoreHttpClientConfig = {
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      authBaseUrl: config.authBaseUrl ?? DEFAULT_AUTH_BASE_URL,
      sdkName: '@uluops/registry-sdk',
      sdkVersion: SDK_VERSION,
      loggerPrefix: '[registry-sdk]',
      timeout: config.timeout,
      retries: config.retries,
      debug: config.debug,
      defaultHeaders: {
        'Accept': 'application/json',
        ...(config.orgSlug ? { 'X-Org-Slug': config.orgSlug } : {}),
      },
      apiKey: config.apiKey,
      email: config.email,
      password: config.password,
      sessionToken: config.sessionToken,
      onTokenRefresh: config.onTokenRefresh,
      onRateLimitApproaching: config.onRateLimitApproaching,
      rateLimitThreshold: config.rateLimitThreshold,
    };
    super(coreConfig);
  }
}
