/**
 * Authentication strategies for the Registry SDK
 *
 * The registry API supports two authentication methods:
 * 1. API Key - Bearer token using API key (preferred)
 * 2. Session Token - JWT token from the ops-uluops-api
 */

import { API_KEY_PREFIX } from '../config/constants.js';
import { ValidationError } from '../errors/errors.js';

/**
 * Authentication strategy interface
 */
export interface AuthStrategy {
  /**
   * Get the Authorization header value
   */
  getAuthorizationHeader(): string;

  /**
   * Check if credentials can be refreshed
   */
  canRefresh(): boolean;

  /**
   * Refresh the credentials
   */
  refresh(): Promise<void>;

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean;

  /**
   * Get the authentication type
   */
  getType(): 'api_key' | 'session';
}

/**
 * Configuration for creating an auth strategy
 */
export interface AuthConfig {
  apiKey?: string;
  sessionToken?: string;
  onTokenRefresh?: (token: string) => void;
}

/**
 * Minimum API key length (prefix + at least 16 chars)
 */
const MIN_API_KEY_LENGTH = 20;

/**
 * Valid API key character pattern (alphanumeric, underscores, hyphens)
 */
const API_KEY_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * API key authentication strategy
 */
export class ApiKeyAuth implements AuthStrategy {
  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new ValidationError('API key is required', { field: 'apiKey' });
    }
    if (!apiKey.startsWith(API_KEY_PREFIX)) {
      throw new ValidationError(`Invalid API key format. Expected prefix: ${API_KEY_PREFIX}`, { field: 'apiKey' });
    }
    if (apiKey.length < MIN_API_KEY_LENGTH) {
      throw new ValidationError(`Invalid API key format. Key too short (min ${MIN_API_KEY_LENGTH} chars)`, { field: 'apiKey', minLength: MIN_API_KEY_LENGTH });
    }
    if (!API_KEY_PATTERN.test(apiKey)) {
      throw new ValidationError('Invalid API key format. Key contains invalid characters', { field: 'apiKey' });
    }
  }

  getAuthorizationHeader(): string {
    return `Bearer ${this.apiKey}`;
  }

  canRefresh(): boolean {
    return false; // API keys don't refresh
  }

  async refresh(): Promise<void> {
    throw new Error('API keys cannot be refreshed');
  }

  isAuthenticated(): boolean {
    return true; // If we have a key, we're authenticated
  }

  getType(): 'api_key' {
    return 'api_key';
  }
}

/**
 * JWT format pattern: three base64url segments separated by dots
 */
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/**
 * Validate JWT token format (not cryptographic validity)
 */
function isValidJwtFormat(token: string): boolean {
  return JWT_PATTERN.test(token);
}

/**
 * JWT session authentication strategy
 *
 * Session tokens are obtained from the ops-uluops-api and can be used
 * to authenticate with the registry API. Tokens cannot be refreshed
 * directly through the registry API - the user must re-authenticate
 * with the ops-api to get a new token.
 */
export class JwtSessionAuth implements AuthStrategy {
  private sessionToken: string;

  constructor(
    sessionToken: string,
    private readonly onTokenRefresh?: (token: string) => void
  ) {
    if (!sessionToken) {
      throw new ValidationError('Session token is required', { field: 'sessionToken' });
    }
    if (!isValidJwtFormat(sessionToken)) {
      throw new ValidationError('Invalid session token format. Expected JWT (header.payload.signature)', { field: 'sessionToken' });
    }
    this.sessionToken = sessionToken;
  }

  getAuthorizationHeader(): string {
    return `Bearer ${this.sessionToken}`;
  }

  canRefresh(): boolean {
    return false; // Session tokens must be refreshed via ops-api
  }

  async refresh(): Promise<void> {
    throw new Error(
      'Session tokens cannot be refreshed through the registry API. ' +
        'Please re-authenticate with the ops-uluops-api to get a new token.'
    );
  }

  isAuthenticated(): boolean {
    return !!this.sessionToken;
  }

  getType(): 'session' {
    return 'session';
  }

  /**
   * Update the session token (called externally when token is refreshed)
   */
  updateToken(newToken: string): void {
    if (!newToken) {
      throw new ValidationError('Session token is required', { field: 'sessionToken' });
    }
    if (!isValidJwtFormat(newToken)) {
      throw new ValidationError('Invalid session token format. Expected JWT (header.payload.signature)', { field: 'sessionToken' });
    }
    this.sessionToken = newToken;
    this.onTokenRefresh?.(newToken);
  }

  /**
   * Get the current session token
   */
  getSessionToken(): string {
    return this.sessionToken;
  }
}

/**
 * Create an auth strategy from config
 */
export function createAuthStrategy(config: AuthConfig): AuthStrategy {
  // Priority 1: API key (preferred)
  if (config.apiKey) {
    return new ApiKeyAuth(config.apiKey);
  }

  // Priority 2: Session token
  if (config.sessionToken) {
    return new JwtSessionAuth(config.sessionToken, config.onTokenRefresh);
  }

  throw new Error(
    'No valid credentials provided. Supply apiKey or sessionToken.'
  );
}
