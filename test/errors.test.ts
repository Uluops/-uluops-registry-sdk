/**
 * Tests for error classes and utilities
 */

import { describe, it, expect } from 'vitest';
import {
  RegistryApiError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  PayloadTooLargeError,
  UnprocessableError,
  RateLimitError,
  ServiceUnavailableError,
  NetworkError,
  TimeoutError,
  createErrorFromStatus,
  isRegistryApiError,
  isValidationError,
  isNotFoundError,
  isConflictError,
  isUnprocessableError,
  isRateLimitError,
} from '../src/errors/errors.js';

describe('error classes', () => {
  describe('RegistryApiError', () => {
    it('should create with required fields', () => {
      const error = new RegistryApiError(500, 'Server error');
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Server error');
      expect(error.code).toBe('UNKNOWN');
      expect(error.name).toBe('RegistryApiError');
    });

    it('should create with all fields', () => {
      const error = new RegistryApiError(
        500,
        'Server error',
        'CUSTOM_CODE',
        { key: 'value' },
        'req-123'
      );
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.details).toEqual({ key: 'value' });
      expect(error.requestId).toBe('req-123');
    });

    it('should serialize to JSON', () => {
      const error = new RegistryApiError(500, 'Server error', 'CODE', { key: 'value' }, 'req-123');
      const json = error.toJSON();
      expect(json).toEqual({
        name: 'RegistryApiError',
        message: 'Server error',
        statusCode: 500,
        code: 'CODE',
        details: { key: 'value' },
        requestId: 'req-123',
      });
    });

    describe('isRetryable', () => {
      it('should return true for 502 Bad Gateway', () => {
        const error = new RegistryApiError(502, 'Bad Gateway');
        expect(error.isRetryable()).toBe(true);
      });

      it('should return true for 503 Service Unavailable', () => {
        const error = new RegistryApiError(503, 'Service Unavailable');
        expect(error.isRetryable()).toBe(true);
      });

      it('should return true for 504 Gateway Timeout', () => {
        const error = new RegistryApiError(504, 'Gateway Timeout');
        expect(error.isRetryable()).toBe(true);
      });

      it('should return true for 429 Too Many Requests', () => {
        const error = new RegistryApiError(429, 'Too Many Requests');
        expect(error.isRetryable()).toBe(true);
      });

      it('should return false for 400 Bad Request', () => {
        const error = new RegistryApiError(400, 'Bad Request');
        expect(error.isRetryable()).toBe(false);
      });

      it('should return false for 401 Unauthorized', () => {
        const error = new RegistryApiError(401, 'Unauthorized');
        expect(error.isRetryable()).toBe(false);
      });

      it('should return false for 404 Not Found', () => {
        const error = new RegistryApiError(404, 'Not Found');
        expect(error.isRetryable()).toBe(false);
      });

      it('should return false for 500 Internal Server Error', () => {
        const error = new RegistryApiError(500, 'Internal Server Error');
        expect(error.isRetryable()).toBe(false);
      });
    });
  });

  describe('ValidationError', () => {
    it('should create with message', () => {
      const error = new ValidationError('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    it('should create with details', () => {
      const error = new ValidationError('Invalid input', { field: 'name', reason: 'required' });
      expect(error.details).toEqual({ field: 'name', reason: 'required' });
    });

    it('should not be retryable', () => {
      const error = new ValidationError('Invalid input');
      expect(error.isRetryable()).toBe(false);
    });
  });

  describe('UnauthorizedError', () => {
    it('should create with default message', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication required');
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.name).toBe('UnauthorizedError');
    });

    it('should create with custom message', () => {
      const error = new UnauthorizedError('Invalid token');
      expect(error.message).toBe('Invalid token');
    });

    it('should not be retryable', () => {
      const error = new UnauthorizedError();
      expect(error.isRetryable()).toBe(false);
    });
  });

  describe('ForbiddenError', () => {
    it('should create with default message', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Access denied');
      expect(error.code).toBe('FORBIDDEN');
      expect(error.name).toBe('ForbiddenError');
    });

    it('should create with custom message', () => {
      const error = new ForbiddenError('Insufficient permissions');
      expect(error.message).toBe('Insufficient permissions');
    });

    it('should not be retryable', () => {
      const error = new ForbiddenError();
      expect(error.isRetryable()).toBe(false);
    });
  });

  describe('NotFoundError', () => {
    it('should create with resource only', () => {
      const error = new NotFoundError('Definition');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Definition not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('NotFoundError');
      expect(error.details).toEqual({ resource: 'Definition' });
    });

    it('should create with resource and identifier', () => {
      const error = new NotFoundError('Definition', 'agent/my-agent@1.0.0');
      expect(error.message).toBe("Definition 'agent/my-agent@1.0.0' not found");
      expect(error.details).toEqual({
        resource: 'Definition',
        identifier: 'agent/my-agent@1.0.0',
      });
    });

    it('should not be retryable', () => {
      const error = new NotFoundError('Resource');
      expect(error.isRetryable()).toBe(false);
    });
  });

  describe('ConflictError', () => {
    it('should create with message', () => {
      const error = new ConflictError('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Resource already exists');
      expect(error.code).toBe('CONFLICT');
      expect(error.name).toBe('ConflictError');
    });

    it('should create with details', () => {
      const error = new ConflictError('Conflict', { existingId: '123' });
      expect(error.details).toEqual({ existingId: '123' });
    });

    it('should not be retryable', () => {
      const error = new ConflictError('Conflict');
      expect(error.isRetryable()).toBe(false);
    });
  });

  describe('PayloadTooLargeError', () => {
    it('should create with default message', () => {
      const error = new PayloadTooLargeError();
      expect(error.statusCode).toBe(413);
      expect(error.message).toBe('Request payload too large');
      expect(error.code).toBe('PAYLOAD_TOO_LARGE');
      expect(error.name).toBe('PayloadTooLargeError');
    });

    it('should create with custom message and max size', () => {
      const error = new PayloadTooLargeError('YAML exceeds limit', 102400);
      expect(error.message).toBe('YAML exceeds limit');
      expect(error.details).toEqual({ maxSize: 102400 });
    });

    it('should not be retryable', () => {
      const error = new PayloadTooLargeError();
      expect(error.isRetryable()).toBe(false);
    });
  });

  describe('UnprocessableError', () => {
    it('should create with message', () => {
      const error = new UnprocessableError('Invalid YAML structure');
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe('Invalid YAML structure');
      expect(error.code).toBe('UNPROCESSABLE_ENTITY');
      expect(error.name).toBe('UnprocessableError');
    });

    it('should create with details', () => {
      const error = new UnprocessableError('Validation failed', {
        errors: ['Missing required field: name'],
      });
      expect(error.details).toEqual({
        errors: ['Missing required field: name'],
      });
    });

    it('should not be retryable', () => {
      const error = new UnprocessableError('Unprocessable');
      expect(error.isRetryable()).toBe(false);
    });
  });

  describe('RateLimitError', () => {
    it('should create without retry-after', () => {
      const error = new RateLimitError();
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.name).toBe('RateLimitError');
      expect(error.retryAfter).toBeUndefined();
    });

    it('should create with retry-after', () => {
      const error = new RateLimitError(60);
      expect(error.message).toBe('Rate limit exceeded. Retry after 60 seconds');
      expect(error.retryAfter).toBe(60);
      expect(error.details).toEqual({ retryAfter: 60 });
    });

    it('should be retryable', () => {
      const error = new RateLimitError();
      expect(error.isRetryable()).toBe(true);
    });
  });

  describe('ServiceUnavailableError', () => {
    it('should create with default message', () => {
      const error = new ServiceUnavailableError();
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe('Service temporarily unavailable');
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.name).toBe('ServiceUnavailableError');
    });

    it('should create with custom message and retry-after', () => {
      const error = new ServiceUnavailableError('Maintenance mode', 300);
      expect(error.message).toBe('Maintenance mode');
      expect(error.retryAfter).toBe(300);
      expect(error.details).toEqual({ retryAfter: 300 });
    });

    it('should be retryable', () => {
      const error = new ServiceUnavailableError();
      expect(error.isRetryable()).toBe(true);
    });
  });

  describe('NetworkError', () => {
    it('should create with message', () => {
      const error = new NetworkError('Connection refused');
      expect(error.statusCode).toBe(0);
      expect(error.message).toBe('Connection refused');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.name).toBe('NetworkError');
    });

    it('should not be retryable by default', () => {
      const error = new NetworkError('Connection refused');
      expect(error.isRetryable()).toBe(false);
    });
  });

  describe('TimeoutError', () => {
    it('should create with timeout value', () => {
      const error = new TimeoutError(30000);
      expect(error.statusCode).toBe(0);
      expect(error.message).toBe('Request timed out after 30000ms');
      expect(error.code).toBe('TIMEOUT');
      expect(error.name).toBe('TimeoutError');
      expect(error.details).toEqual({ timeoutMs: 30000 });
    });

    it('should not be retryable by default', () => {
      const error = new TimeoutError(30000);
      expect(error.isRetryable()).toBe(false);
    });
  });
});

describe('createErrorFromStatus', () => {
  it('should create ValidationError for 400', () => {
    const error = createErrorFromStatus(400, 'Bad Request', undefined, { field: 'name' });
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.details).toEqual({ field: 'name' });
  });

  it('should create UnauthorizedError for 401', () => {
    const error = createErrorFromStatus(401, 'Unauthorized');
    expect(error).toBeInstanceOf(UnauthorizedError);
  });

  it('should create ForbiddenError for 403', () => {
    const error = createErrorFromStatus(403, 'Forbidden');
    expect(error).toBeInstanceOf(ForbiddenError);
  });

  it('should create NotFoundError for 404', () => {
    const error = createErrorFromStatus(404, 'Not Found');
    expect(error).toBeInstanceOf(NotFoundError);
  });

  it('should create ConflictError for 409', () => {
    const error = createErrorFromStatus(409, 'Conflict', undefined, { existing: true });
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.details).toEqual({ existing: true });
  });

  it('should create PayloadTooLargeError for 413', () => {
    const error = createErrorFromStatus(413, 'Too Large', undefined, { maxSize: 100000 });
    expect(error).toBeInstanceOf(PayloadTooLargeError);
  });

  it('should create UnprocessableError for 422', () => {
    const error = createErrorFromStatus(422, 'Unprocessable', undefined, { errors: [] });
    expect(error).toBeInstanceOf(UnprocessableError);
    expect(error.details).toEqual({ errors: [] });
  });

  it('should create RateLimitError for 429', () => {
    const error = createErrorFromStatus(429, 'Rate limited', undefined, { retryAfter: 60 });
    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfter).toBe(60);
  });

  it('should create ServiceUnavailableError for 503', () => {
    const error = createErrorFromStatus(503, 'Unavailable', undefined, { retryAfter: 30 });
    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect((error as ServiceUnavailableError).retryAfter).toBe(30);
  });

  it('should create ServiceUnavailableError for 502', () => {
    const error = createErrorFromStatus(502, 'Bad Gateway');
    expect(error).toBeInstanceOf(ServiceUnavailableError);
  });

  it('should create ServiceUnavailableError for 504', () => {
    const error = createErrorFromStatus(504, 'Gateway Timeout');
    expect(error).toBeInstanceOf(ServiceUnavailableError);
  });

  it('should create generic RegistryApiError for unknown status', () => {
    const error = createErrorFromStatus(418, "I'm a teapot", 'TEAPOT', undefined, 'req-123');
    expect(error).toBeInstanceOf(RegistryApiError);
    expect(error.statusCode).toBe(418);
    expect(error.requestId).toBe('req-123');
  });
});

describe('type guards', () => {
  describe('isRegistryApiError', () => {
    it('should return true for RegistryApiError', () => {
      const error = new RegistryApiError(500, 'Error');
      expect(isRegistryApiError(error)).toBe(true);
    });

    it('should return true for subclasses', () => {
      expect(isRegistryApiError(new ValidationError('Error'))).toBe(true);
      expect(isRegistryApiError(new NotFoundError('Resource'))).toBe(true);
      expect(isRegistryApiError(new RateLimitError())).toBe(true);
    });

    it('should return false for regular Error', () => {
      expect(isRegistryApiError(new Error('Error'))).toBe(false);
    });

    it('should return false for non-errors', () => {
      expect(isRegistryApiError('error')).toBe(false);
      expect(isRegistryApiError(null)).toBe(false);
      expect(isRegistryApiError(undefined)).toBe(false);
      expect(isRegistryApiError({})).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should return true for ValidationError', () => {
      expect(isValidationError(new ValidationError('Error'))).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isValidationError(new NotFoundError('Resource'))).toBe(false);
      expect(isValidationError(new Error('Error'))).toBe(false);
    });
  });

  describe('isNotFoundError', () => {
    it('should return true for NotFoundError', () => {
      expect(isNotFoundError(new NotFoundError('Resource'))).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isNotFoundError(new ValidationError('Error'))).toBe(false);
    });
  });

  describe('isConflictError', () => {
    it('should return true for ConflictError', () => {
      expect(isConflictError(new ConflictError('Conflict'))).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isConflictError(new NotFoundError('Resource'))).toBe(false);
    });
  });

  describe('isUnprocessableError', () => {
    it('should return true for UnprocessableError', () => {
      expect(isUnprocessableError(new UnprocessableError('Error'))).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isUnprocessableError(new ValidationError('Error'))).toBe(false);
    });
  });

  describe('isRateLimitError', () => {
    it('should return true for RateLimitError', () => {
      expect(isRateLimitError(new RateLimitError())).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isRateLimitError(new ServiceUnavailableError())).toBe(false);
    });
  });
});
