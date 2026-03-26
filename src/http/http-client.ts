/**
 * HTTP client for the Registry API
 *
 * Thin subclass of HttpClient from @uluops/sdk-core, passing
 * registry-sdk defaults (baseUrl, authBaseUrl, extra headers).
 */

import {
  HttpClient,
  type HttpClientConfig as CoreHttpClientConfig,
} from '@uluops/sdk-core/http';
import {
  DEFAULT_BASE_URL,
  DEFAULT_AUTH_BASE_URL,
  SDK_VERSION,
} from '../config/constants.js';

/**
 * HTTP client configuration for the registry SDK
 */
export interface HttpClientConfig {
  baseUrl?: string;
  authBaseUrl?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
  apiKey?: string;
  email?: string;
  password?: string;
  sessionToken?: string;
  /** Org slug for multi-tenancy — sets X-Org-Slug header on all requests */
  orgSlug?: string;
  onTokenRefresh?: (token: string) => void;
}

/**
 * HTTP client for the registry API using native fetch.
 * Extends the core HttpClient with registry-specific defaults.
 */
export class RegistryHttpClient extends HttpClient {
  constructor(config: HttpClientConfig = {}) {
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
        'X-Content-Type-Options': 'nosniff',
        ...(config.orgSlug ? { 'X-Org-Slug': config.orgSlug } : {}),
      },
      apiKey: config.apiKey,
      email: config.email,
      password: config.password,
      sessionToken: config.sessionToken,
      onTokenRefresh: config.onTokenRefresh,
    };
    super(coreConfig);
  }
}
