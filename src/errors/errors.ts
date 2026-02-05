/**
 * Error hierarchy for the Registry SDK
 *
 * Registry API errors include additional error types compared to ops-sdk:
 * - PayloadTooLargeError (413) - YAML exceeds 100KB limit
 * - UnprocessableError (422) - Valid request but cannot be processed (e.g., invalid YAML)
 */

import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';

/**
 * Base API error class for all registry API errors
 */
export class RegistryApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string = ERROR_CODES.UNKNOWN,
    public readonly details?: Record<string, unknown>,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = 'RegistryApiError';
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Check if this error is retryable (transient server errors)
   */
  isRetryable(): boolean {
    return (
      this.statusCode === HTTP_STATUS.BAD_GATEWAY ||
      this.statusCode === HTTP_STATUS.SERVICE_UNAVAILABLE ||
      this.statusCode === HTTP_STATUS.GATEWAY_TIMEOUT ||
      this.statusCode === HTTP_STATUS.TOO_MANY_REQUESTS
    );
  }

  /**
   * Convert to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      requestId: this.requestId,
    };
  }
}

/**
 * 400 Bad Request - Validation errors with field-level details
 */
export class ValidationError extends RegistryApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(HTTP_STATUS.BAD_REQUEST, message, ERROR_CODES.VALIDATION_ERROR, details);
    this.name = 'ValidationError';
  }
}

/**
 * 401 Unauthorized - Authentication required or invalid
 */
export class UnauthorizedError extends RegistryApiError {
  constructor(message = 'Authentication required') {
    super(HTTP_STATUS.UNAUTHORIZED, message, ERROR_CODES.UNAUTHORIZED);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 403 Forbidden - Authenticated but access denied
 */
export class ForbiddenError extends RegistryApiError {
  constructor(message = 'Access denied') {
    super(HTTP_STATUS.FORBIDDEN, message, ERROR_CODES.FORBIDDEN);
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends RegistryApiError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} '${identifier}' not found`
      : `${resource} not found`;
    super(
      HTTP_STATUS.NOT_FOUND,
      message,
      ERROR_CODES.NOT_FOUND,
      identifier ? { resource, identifier } : { resource }
    );
    this.name = 'NotFoundError';
  }
}

/**
 * 409 Conflict - Resource already exists or state conflict
 */
export class ConflictError extends RegistryApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(HTTP_STATUS.CONFLICT, message, ERROR_CODES.CONFLICT, details);
    this.name = 'ConflictError';
  }
}

/**
 * 413 Payload Too Large - Request body exceeds size limit (YAML > 100KB)
 *
 * Registry-specific: Used when YAML content exceeds the 100KB limit
 */
export class PayloadTooLargeError extends RegistryApiError {
  constructor(message = 'Request payload too large', maxSize?: number) {
    super(HTTP_STATUS.PAYLOAD_TOO_LARGE, message, ERROR_CODES.PAYLOAD_TOO_LARGE, { maxSize });
    this.name = 'PayloadTooLargeError';
  }
}

/**
 * 422 Unprocessable Entity - Request is valid but cannot be processed
 *
 * Registry-specific: Used when YAML is syntactically valid but semantically invalid
 * (e.g., missing required fields, invalid references, cycle detection)
 */
export class UnprocessableError extends RegistryApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(HTTP_STATUS.UNPROCESSABLE_ENTITY, message, ERROR_CODES.UNPROCESSABLE_ENTITY, details);
    this.name = 'UnprocessableError';
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends RegistryApiError {
  public readonly retryAfter?: number;

  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `Rate limit exceeded. Retry after ${retryAfter} seconds`
      : 'Rate limit exceeded';
    super(HTTP_STATUS.TOO_MANY_REQUESTS, message, ERROR_CODES.RATE_LIMIT_ERROR, { retryAfter });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * 503 Service Unavailable - Server temporarily unavailable
 */
export class ServiceUnavailableError extends RegistryApiError {
  public readonly retryAfter?: number;

  constructor(message = 'Service temporarily unavailable', retryAfter?: number) {
    super(HTTP_STATUS.SERVICE_UNAVAILABLE, message, ERROR_CODES.SERVICE_UNAVAILABLE, {
      retryAfter,
    });
    this.name = 'ServiceUnavailableError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Network/connection error (no response received)
 */
export class NetworkError extends RegistryApiError {
  constructor(message: string) {
    super(0, message, ERROR_CODES.NETWORK_ERROR);
    this.name = 'NetworkError';
  }
}

/**
 * Request timeout error
 */
export class TimeoutError extends RegistryApiError {
  constructor(timeoutMs: number) {
    super(0, `Request timed out after ${timeoutMs}ms`, ERROR_CODES.TIMEOUT, { timeoutMs });
    this.name = 'TimeoutError';
  }
}

/**
 * Create appropriate error from HTTP status code
 */
export function createErrorFromStatus(
  statusCode: number,
  message: string,
  code?: string,
  details?: Record<string, unknown>,
  requestId?: string
): RegistryApiError {
  switch (statusCode) {
    case HTTP_STATUS.BAD_REQUEST:
      return new ValidationError(message, details);
    case HTTP_STATUS.UNAUTHORIZED:
      return new UnauthorizedError(message);
    case HTTP_STATUS.FORBIDDEN:
      return new ForbiddenError(message);
    case HTTP_STATUS.NOT_FOUND:
      return new NotFoundError(message);
    case HTTP_STATUS.CONFLICT:
      return new ConflictError(message, details);
    case HTTP_STATUS.PAYLOAD_TOO_LARGE: {
      const maxSize = typeof details?.maxSize === 'number' ? details.maxSize : undefined;
      return new PayloadTooLargeError(message, maxSize);
    }
    case HTTP_STATUS.UNPROCESSABLE_ENTITY:
      return new UnprocessableError(message, details);
    case HTTP_STATUS.TOO_MANY_REQUESTS: {
      const retryAfter = typeof details?.retryAfter === 'number' ? details.retryAfter : undefined;
      return new RateLimitError(retryAfter);
    }
    case HTTP_STATUS.SERVICE_UNAVAILABLE:
    case HTTP_STATUS.BAD_GATEWAY:
    case HTTP_STATUS.GATEWAY_TIMEOUT: {
      const retryAfter = typeof details?.retryAfter === 'number' ? details.retryAfter : undefined;
      return new ServiceUnavailableError(message, retryAfter);
    }
    default:
      return new RegistryApiError(statusCode, message, code, details, requestId);
  }
}

/**
 * Type guard to check if an error is a RegistryApiError
 */
export function isRegistryApiError(error: unknown): error is RegistryApiError {
  return error instanceof RegistryApiError;
}

/**
 * Type guard for specific error types
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isConflictError(error: unknown): error is ConflictError {
  return error instanceof ConflictError;
}

export function isUnprocessableError(error: unknown): error is UnprocessableError {
  return error instanceof UnprocessableError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}
