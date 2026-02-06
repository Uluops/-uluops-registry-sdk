/**
 * HTTP client for the Registry API
 */

import type { ZodType } from 'zod';
import {
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT,
  DEFAULT_RETRY_COUNT,
  BACKOFF_BASE_MS,
  MAX_BACKOFF_MS,
  JITTER_MIN,
  JITTER_MAX,
  USER_AGENT,
} from '../config/constants.js';
import {
  RegistryApiError,
  createErrorFromStatus,
  NetworkError,
  TimeoutError,
} from '../errors/errors.js';
import { createAuthStrategy, type AuthStrategy, type AuthConfig } from './auth-strategy.js';
import { createLogger, type Logger } from '../utils/logger.js';
import { sleep, parseRateLimitHeaders, type RateLimitInfo } from '../utils/helpers.js';

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
  apiKey?: string;
  sessionToken?: string;
  onTokenRefresh?: (token: string) => void;
}

/**
 * HTTP client for the registry API using native fetch
 */
export class RegistryHttpClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly authStrategy: AuthStrategy | null;
  private readonly logger: Logger;
  private readonly retries: number;
  private readonly defaultHeaders: Record<string, string>;
  private lastRateLimitInfo: RateLimitInfo | null = null;

  constructor(config: HttpClientConfig = {}) {
    this.logger = createLogger(config.debug ?? false);
    this.retries = config.retries ?? DEFAULT_RETRY_COUNT;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': USER_AGENT,
      'X-Content-Type-Options': 'nosniff',
    };

    // Create auth strategy if credentials provided
    const hasCredentials = config.apiKey || config.sessionToken;
    if (hasCredentials) {
      const authConfig: AuthConfig = {
        apiKey: config.apiKey,
        sessionToken: config.sessionToken,
        onTokenRefresh: config.onTokenRefresh,
      };
      this.authStrategy = createAuthStrategy(authConfig);
    } else {
      this.authStrategy = null;
    }
  }

  /**
   * HTTP methods that are automatically retried without opt-in.
   * PUT/DELETE are technically idempotent but require explicit `retryMutations: true`.
   */
  private static readonly AUTO_RETRY_METHODS = new Set(['GET']);

  /**
   * Make an authenticated request with retry support
   *
   * By default, only GET requests are retried on transient errors.
   * Set `retryMutations: true` in options to also retry POST/PUT/DELETE
   * (only use this for idempotent endpoints like recording executions with a runId).
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: object,
    options?: { params?: object; retries?: number; retryMutations?: boolean; headers?: Record<string, string>; schema?: ZodType<T> }
  ): Promise<T> {
    const maxAttempts = options?.retries ?? this.retries;
    const canRetry = RegistryHttpClient.AUTO_RETRY_METHODS.has(method) || (options?.retryMutations === true);
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.doFetch<T>(method, endpoint, data, options);
        if (options?.schema) {
          return options.schema.parse(result);
        }
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry
        const shouldRetry =
          canRetry &&
          lastError instanceof RegistryApiError &&
          lastError.isRetryable() &&
          attempt < maxAttempts;

        if (shouldRetry) {
          const delay = this.calculateBackoff(attempt);
          this.logger.debug(`Attempt ${attempt}/${maxAttempts} failed, retrying after ${delay}ms`);
          await sleep(delay);
          continue;
        }

        throw lastError;
      }
    }

    throw lastError ?? new Error('Request failed');
  }

  /**
   * Execute a fetch request
   */
  private async doFetch<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: object,
    options?: { params?: object; headers?: Record<string, string> }
  ): Promise<T> {
    // Build URL with query params
    const url = new URL(this.buildUrl(endpoint));

    // For GET requests, data goes into query params
    // For other methods, params go into query string
    const queryParams = method === 'GET' ? data : options?.params;
    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value === undefined || value === null) {
          continue;
        }
        if (Array.isArray(value)) {
          for (const item of value) {
            url.searchParams.append(key, String(item));
          }
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...options?.headers,
    };
    if (this.authStrategy) {
      headers['Authorization'] = this.authStrategy.getAuthorizationHeader();
    }

    // Prepare request body
    const body = method !== 'GET' ? JSON.stringify(data) : undefined;

    // Fetch with timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      // Log response
      this.logger.debug(`${method} ${endpoint} -> ${response.status}`);

      // Parse rate limit headers
      this.lastRateLimitInfo = parseRateLimitHeaders(response.headers);

      // Handle errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.createHttpError(response.status, errorData, response.headers);
      }

      // Handle 204 No Content (e.g., DELETE responses)
      if (response.status === 204) {
        return undefined as T;
      }

      const responseData: unknown = await response.json();
      if (!isDataEnvelope(responseData)) {
        throw new Error(
          `Unexpected API response format: expected { data: ... } wrapper but received ${
            responseData === null ? 'null' : typeof responseData
          }`
        );
      }
      return responseData.data as T;
    } catch (error) {
      // Log error responses
      if (error instanceof RegistryApiError) {
        this.logger.debug(`${method} ${endpoint} -> ${error.statusCode ?? 'ERROR'}`);
      }
      throw this.handleFetchError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Make a request that returns the full response (for non-standard responses)
   */
  async requestRaw<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: object,
    options?: { params?: object; headers?: Record<string, string>; schema?: ZodType<T> }
  ): Promise<T> {
    const url = new URL(this.buildUrl(endpoint));
    const queryParams = method === 'GET' ? data : options?.params;
    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...options?.headers,
    };
    if (this.authStrategy) {
      headers['Authorization'] = this.authStrategy.getAuthorizationHeader();
    }

    const body = method !== 'GET' ? JSON.stringify(data) : undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.createHttpError(response.status, errorData, response.headers);
      }

      const responseData: unknown = await response.json();
      if (responseData === null || typeof responseData !== 'object') {
        throw new Error('Expected JSON object response');
      }
      if (options?.schema) {
        return options.schema.parse(responseData);
      }
      return responseData as T;
    } catch (error) {
      throw this.handleFetchError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * GET request helper
   */
  async get<T>(endpoint: string, params?: object, options?: { schema?: ZodType<T> }): Promise<T> {
    return this.request<T>('GET', endpoint, params, options);
  }

  /**
   * POST request helper
   */
  async post<T>(endpoint: string, data?: object, options?: { schema?: ZodType<T> }): Promise<T> {
    return this.request<T>('POST', endpoint, data, options);
  }

  /**
   * PUT request helper
   */
  async put<T>(endpoint: string, data?: object, options?: { schema?: ZodType<T> }): Promise<T> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  /**
   * DELETE request helper
   */
  async delete<T>(endpoint: string, data?: object, options?: { schema?: ZodType<T> }): Promise<T> {
    return this.request<T>('DELETE', endpoint, data, options);
  }

  /**
   * Get the auth strategy (for session management)
   */
  getAuthStrategy(): AuthStrategy | null {
    return this.authStrategy;
  }

  /**
   * Get the last rate limit info from a response.
   * Returns a copy so callers cannot mutate internal state.
   */
  getRateLimitInfo(): RateLimitInfo | null {
    if (!this.lastRateLimitInfo) return null;
    return { ...this.lastRateLimitInfo };
  }

  /**
   * Create an HTTP error from response data
   */
  /**
   * Keys that should be stripped from error details to prevent leaking server internals
   */
  private static readonly REDACTED_DETAIL_KEYS = new Set([
    'stack', 'trace', 'stackTrace', 'internal', 'query', 'sql', 'sqlMessage',
    'sqlState', 'errno', 'syscall', 'hostname', 'address',
  ]);

  private createHttpError(
    status: number,
    data: unknown,
    headers: Headers
  ): RegistryApiError {
    const apiError = (data as { error?: { code?: string; message?: string; details?: Record<string, unknown> } })?.error;
    const requestId = headers.get('x-request-id') ?? undefined;

    // Parse retry-after for rate limit and service unavailable errors
    const retryAfter = headers.get('retry-after');
    const details: Record<string, unknown> = {};

    // Copy details, stripping keys that could contain server internals
    if (apiError?.details) {
      for (const [key, value] of Object.entries(apiError.details)) {
        if (!RegistryHttpClient.REDACTED_DETAIL_KEYS.has(key)) {
          details[key] = value;
        }
      }
    }

    if (retryAfter) {
      const parsedRetryAfter = parseInt(retryAfter, 10);
      if (!isNaN(parsedRetryAfter)) {
        details.retryAfter = parsedRetryAfter;
      }
    }

    return createErrorFromStatus(
      status,
      apiError?.message ?? `HTTP ${status}`,
      apiError?.code,
      Object.keys(details).length > 0 ? details : undefined,
      requestId
    );
  }

  /**
   * Handle fetch-specific errors (network, timeout, etc.)
   */
  private handleFetchError(error: unknown): Error {
    // Already transformed to RegistryApiError
    if (error instanceof RegistryApiError) {
      return error;
    }

    // Timeout via AbortController
    if (error instanceof DOMException && error.name === 'AbortError') {
      return new TimeoutError(this.timeout);
    }

    // Network errors (fetch throws TypeError for network issues)
    if (error instanceof TypeError) {
      return new NetworkError(error.message);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error(String(error));
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoff(attempt: number): number {
    const delay = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
    const jitterRange = JITTER_MAX - JITTER_MIN;
    const jitter = delay * (JITTER_MIN + Math.random() * jitterRange);
    return Math.min(delay + jitter, MAX_BACKOFF_MS);
  }

  /**
   * Build full URL by concatenating baseUrl and endpoint
   */
  private buildUrl(endpoint: string): string {
    const base = this.baseUrl.replace(/\/$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }
}

/**
 * Type guard for the standard API response envelope `{ data: T }`.
 */
function isDataEnvelope(value: unknown): value is { data: unknown } {
  return value !== null && typeof value === 'object' && 'data' in value;
}
