/**
 * HTTP client for the Registry API
 *
 * Registry-specific HTTP client extending sdk-core's HttpClient
 * with registry defaults (baseUrl, authBaseUrl, extra headers).
 */

import {
  HttpClient,
  type HttpClientConfig as CoreHttpClientConfig,
  type RequestOptions,
  type WithResponseContext,
} from '@uluops/sdk-core/http';
import type { RateLimitInfo } from '@uluops/sdk-core';
import type { SecurityEventHandler } from '@uluops/sdk-core/http';

// Re-export the structured security-event types so consumers can type their
// onSecurityEvent handler (threaded to sdk-core in the constructor below).
export type {
  SecurityEvent,
  SecurityEventType,
  SecurityEventHandler,
  AuthType,
  AuthFailureEvent,
  RedirectRejectedEvent,
  TokenRefreshFailedEvent,
  AuthStrategyReplacedEvent,
} from '@uluops/sdk-core/http';
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
  /** Auth API base URL for login/refresh (default: https://api.uluops.ai/api/v1) */
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
  /** Called before each retry attempt with attempt info and backoff delay */
  onRetry?: (info: { attempt: number; maxAttempts: number; error: Error; delayMs: number }) => void;
  /**
   * Called when a security-relevant event occurs — a rejected credential, a
   * blocked upstream redirect, a failed token refresh, or a credential swap.
   * Structured, routable telemetry (see `SecurityEvent`). Forwarded to sdk-core.
   */
  onSecurityEvent?: SecurityEventHandler;
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
      // X-Org-Slug is NOT a default header (see `request` below).
      defaultHeaders: {
        'Accept': 'application/json',
      },
      apiKey: config.apiKey,
      email: config.email,
      password: config.password,
      sessionToken: config.sessionToken,
      onTokenRefresh: config.onTokenRefresh,
      onRateLimitApproaching: config.onRateLimitApproaching,
      rateLimitThreshold: config.rateLimitThreshold,
      onRetry: config.onRetry,
      onSecurityEvent: config.onSecurityEvent,
    };
    super(coreConfig);
    this.orgSlug = config.orgSlug;
  }

  /** The configured org, sent as `X-Org-Slug` on WRITES only (see `request`). */
  private readonly orgSlug: string | undefined;

  /**
   * `X-Org-Slug` goes on writes (every non-GET request) and never on reads
   * (definition visibility spec v0.5.1 I-3, phase 1b-iv). The registry treats a
   * verified org header as a HARD scope on reads: a GET carrying it sees only
   * that org's rows. Until 0.57.0 this client sent it on every request, so a
   * client configured with an org (the registry MCP sets `ULUOPS_ORG_SLUG`)
   * could not read another org's public definitions by name. On a write the
   * header QUALIFIES the address — it says which org's row is meant — which is
   * what it is for. A read that needs one org's row names it (`@org/name`).
   * A per-call `headers['X-Org-Slug']` still wins, for either method.
   */
  override request<T>(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', endpoint: string, data: object | undefined, options: RequestOptions & {
    withResponseContext: true;
  }): Promise<WithResponseContext<T>>;
  override request<T>(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', endpoint: string, data?: object, options?: RequestOptions & {
    withResponseContext?: false;
  }): Promise<T>;
  override request<T>(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', endpoint: string, data: object | undefined, options: RequestOptions): Promise<T | WithResponseContext<T>>;
  override request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: object,
    options?: RequestOptions,
  ): Promise<T | WithResponseContext<T>> {
    const scoped = this.orgSlug !== undefined && method !== 'GET'
      ? { ...options, headers: { 'X-Org-Slug': this.orgSlug, ...options?.headers } }
      : options;
    return super.request<T>(method, endpoint, data, scoped as RequestOptions);
  }
}
