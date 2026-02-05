/**
 * Tests for HTTP client including retry logic, timeout handling, and error transformation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import nock from 'nock';
import { RegistryHttpClient } from '../src/http/http-client.js';
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
  TimeoutError,
} from '../src/errors/errors.js';
import { DEFAULT_BASE_URL } from '../src/config/constants.js';

describe('RegistryHttpClient', () => {
  let client: RegistryHttpClient;

  beforeEach(() => {
    nock.cleanAll();
    client = new RegistryHttpClient({
      apiKey: 'ulr_test_key_12345',
      retries: 3,
      timeout: 5000,
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('basic requests', () => {
    it('should make GET requests', async () => {
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .reply(200, { data: { message: 'success' } });

      const result = await client.get<{ message: string }>('/test');
      expect(result.message).toBe('success');
    });

    it('should make POST requests with body', async () => {
      nock(DEFAULT_BASE_URL)
        .post('/test', { name: 'test' })
        .reply(201, { data: { id: '123' } });

      const result = await client.post<{ id: string }>('/test', { name: 'test' });
      expect(result.id).toBe('123');
    });

    it('should make PUT requests', async () => {
      nock(DEFAULT_BASE_URL)
        .put('/test/123', { name: 'updated' })
        .reply(200, { data: { id: '123', name: 'updated' } });

      const result = await client.put<{ id: string; name: string }>('/test/123', {
        name: 'updated',
      });
      expect(result.name).toBe('updated');
    });

    it('should make DELETE requests', async () => {
      nock(DEFAULT_BASE_URL)
        .delete('/test/123')
        .reply(200, { data: { deleted: true } });

      const result = await client.delete<{ deleted: boolean }>('/test/123');
      expect(result.deleted).toBe(true);
    });

    it('should include query parameters for GET requests', async () => {
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .query({ type: 'agent', limit: '10' })
        .reply(200, { data: { items: [] } });

      const result = await client.get<{ items: unknown[] }>('/test', {
        type: 'agent',
        limit: 10,
      });
      expect(result.items).toEqual([]);
    });

    it('should include authorization header', async () => {
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .matchHeader('Authorization', 'Bearer ulr_test_key_12345')
        .reply(200, { data: { authenticated: true } });

      const result = await client.get<{ authenticated: boolean }>('/test');
      expect(result.authenticated).toBe(true);
    });
  });

  describe('error transformation', () => {
    it('should transform 400 to ValidationError', async () => {
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .reply(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: { field: 'name' },
          },
        });

      await expect(client.get('/test')).rejects.toThrow(ValidationError);
      try {
        await client.get('/test');
      } catch (error) {
        // Need a new nock for the second call
      }
    });

    it('should transform 401 to UnauthorizedError', async () => {
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .reply(401, { error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });

      await expect(client.get('/test')).rejects.toThrow(UnauthorizedError);
    });

    it('should transform 403 to ForbiddenError', async () => {
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .reply(403, { error: { code: 'FORBIDDEN', message: 'Access denied' } });

      await expect(client.get('/test')).rejects.toThrow(ForbiddenError);
    });

    it('should transform 404 to NotFoundError', async () => {
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .reply(404, { error: { code: 'NOT_FOUND', message: 'Resource not found' } });

      await expect(client.get('/test')).rejects.toThrow(NotFoundError);
    });

    it('should transform 409 to ConflictError', async () => {
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .reply(409, { error: { code: 'CONFLICT', message: 'Already exists' } });

      await expect(client.get('/test')).rejects.toThrow(ConflictError);
    });

    it('should transform 413 to PayloadTooLargeError', async () => {
      nock(DEFAULT_BASE_URL)
        .post('/test')
        .reply(413, { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Too large' } });

      await expect(client.post('/test', {})).rejects.toThrow(PayloadTooLargeError);
    });

    it('should transform 422 to UnprocessableError', async () => {
      nock(DEFAULT_BASE_URL)
        .post('/test')
        .reply(422, {
          error: { code: 'UNPROCESSABLE_ENTITY', message: 'Invalid YAML' },
        });

      await expect(client.post('/test', {})).rejects.toThrow(UnprocessableError);
    });

    it('should transform 429 to RateLimitError with retry-after', async () => {
      // Use .times(3) because 429 is retryable and client retries 3 times by default
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .times(3)
        .reply(
          429,
          { error: { code: 'RATE_LIMIT_ERROR', message: 'Rate limited' } },
          { 'retry-after': '60' }
        );

      try {
        await client.get('/test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).retryAfter).toBe(60);
      }
    });

    it('should transform 503 to ServiceUnavailableError', async () => {
      // Use .times(3) because 503 is retryable and client retries 3 times by default
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .times(3)
        .reply(503, { error: { code: 'SERVICE_UNAVAILABLE', message: 'Unavailable' } });

      await expect(client.get('/test')).rejects.toThrow(ServiceUnavailableError);
    });

    it('should include request ID from headers', async () => {
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .reply(
          500,
          { error: { code: 'SERVER_ERROR', message: 'Internal error' } },
          { 'x-request-id': 'req-abc-123' }
        );

      try {
        await client.get('/test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RegistryApiError);
        expect((error as RegistryApiError).requestId).toBe('req-abc-123');
      }
    });
  });

  describe('retry logic', () => {
    it('should retry on 502 Bad Gateway', async () => {
      let attempts = 0;
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .times(2)
        .reply(() => {
          attempts++;
          return [502, { error: { message: 'Bad Gateway' } }];
        })
        .get('/test')
        .reply(200, { data: { success: true } });

      const result = await client.get<{ success: boolean }>('/test');
      expect(result.success).toBe(true);
      expect(attempts).toBe(2);
    });

    it('should retry on 503 Service Unavailable', async () => {
      let attempts = 0;
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .times(1)
        .reply(() => {
          attempts++;
          return [503, { error: { message: 'Service Unavailable' } }];
        })
        .get('/test')
        .reply(200, { data: { success: true } });

      const result = await client.get<{ success: boolean }>('/test');
      expect(result.success).toBe(true);
      expect(attempts).toBe(1);
    });

    it('should retry on 504 Gateway Timeout', async () => {
      let attempts = 0;
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .times(1)
        .reply(() => {
          attempts++;
          return [504, { error: { message: 'Gateway Timeout' } }];
        })
        .get('/test')
        .reply(200, { data: { success: true } });

      const result = await client.get<{ success: boolean }>('/test');
      expect(result.success).toBe(true);
      expect(attempts).toBe(1);
    });

    it('should retry on 429 Too Many Requests', async () => {
      let attempts = 0;
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .times(1)
        .reply(() => {
          attempts++;
          return [429, { error: { message: 'Rate Limited' } }];
        })
        .get('/test')
        .reply(200, { data: { success: true } });

      const result = await client.get<{ success: boolean }>('/test');
      expect(result.success).toBe(true);
      expect(attempts).toBe(1);
    });

    it('should NOT retry on 400 Bad Request', async () => {
      let attempts = 0;
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .reply(() => {
          attempts++;
          return [400, { error: { message: 'Bad Request' } }];
        });

      await expect(client.get('/test')).rejects.toThrow(ValidationError);
      expect(attempts).toBe(1);
    });

    it('should NOT retry on 401 Unauthorized', async () => {
      let attempts = 0;
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .reply(() => {
          attempts++;
          return [401, { error: { message: 'Unauthorized' } }];
        });

      await expect(client.get('/test')).rejects.toThrow(UnauthorizedError);
      expect(attempts).toBe(1);
    });

    it('should NOT retry on 404 Not Found', async () => {
      let attempts = 0;
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .reply(() => {
          attempts++;
          return [404, { error: { message: 'Not Found' } }];
        });

      await expect(client.get('/test')).rejects.toThrow(NotFoundError);
      expect(attempts).toBe(1);
    });

    it('should stop retrying after max attempts', async () => {
      let attempts = 0;
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .times(3)
        .reply(() => {
          attempts++;
          return [503, { error: { message: 'Service Unavailable' } }];
        });

      await expect(client.get('/test')).rejects.toThrow(ServiceUnavailableError);
      expect(attempts).toBe(3);
    });

    it('should respect custom retry count', { timeout: 30000 }, async () => {
      let attempts = 0;
      const customClient = new RegistryHttpClient({
        apiKey: 'ulr_test_key_12345',
        retries: 5,
      });

      nock(DEFAULT_BASE_URL)
        .get('/test')
        .times(4)
        .reply(() => {
          attempts++;
          return [503, { error: { message: 'Service Unavailable' } }];
        })
        .get('/test')
        .reply(200, { data: { success: true } });

      const result = await customClient.get<{ success: boolean }>('/test');
      expect(result.success).toBe(true);
      expect(attempts).toBe(4);
    });
  });

  describe('timeout handling', () => {
    it('should timeout slow requests', async () => {
      const shortTimeoutClient = new RegistryHttpClient({
        apiKey: 'ulr_test_key_12345',
        timeout: 100,
        retries: 1,
      });

      nock(DEFAULT_BASE_URL)
        .get('/slow')
        .delay(500)
        .reply(200, { data: { success: true } });

      await expect(shortTimeoutClient.get('/slow')).rejects.toThrow(TimeoutError);
    });

    it('should complete requests within timeout', async () => {
      nock(DEFAULT_BASE_URL)
        .get('/fast')
        .delay(50)
        .reply(200, { data: { success: true } });

      const result = await client.get<{ success: boolean }>('/fast');
      expect(result.success).toBe(true);
    });
  });

  describe('rate limit info', () => {
    it('should parse rate limit headers', async () => {
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .reply(200, { data: { success: true } }, {
          'x-ratelimit-limit': '100',
          'x-ratelimit-remaining': '95',
          'x-ratelimit-reset': '1700000000',
        });

      await client.get('/test');
      const rateLimitInfo = client.getRateLimitInfo();

      expect(rateLimitInfo).not.toBeNull();
      expect(rateLimitInfo?.limit).toBe(100);
      expect(rateLimitInfo?.remaining).toBe(95);
    });

    it('should return null when no rate limit headers', async () => {
      nock(DEFAULT_BASE_URL)
        .get('/test')
        .reply(200, { data: { success: true } });

      await client.get('/test');
      const rateLimitInfo = client.getRateLimitInfo();

      expect(rateLimitInfo).toBeNull();
    });
  });

  describe('requestRaw', () => {
    it('should return raw response without unwrapping', async () => {
      nock(DEFAULT_BASE_URL)
        .get('/raw')
        .reply(200, { models: [{ id: '1' }], total: 1 });

      const result = await client.requestRaw<{ models: { id: string }[]; total: number }>(
        'GET',
        '/raw'
      );
      expect(result.models).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('authentication', () => {
    it('should work without authentication', async () => {
      const unauthClient = new RegistryHttpClient();

      nock(DEFAULT_BASE_URL)
        .get('/public')
        .reply(200, { data: { public: true } });

      const result = await unauthClient.get<{ public: boolean }>('/public');
      expect(result.public).toBe(true);
    });

    it('should return null auth strategy when not authenticated', () => {
      const unauthClient = new RegistryHttpClient();
      expect(unauthClient.getAuthStrategy()).toBeNull();
    });

    it('should return auth strategy when authenticated', () => {
      expect(client.getAuthStrategy()).not.toBeNull();
    });
  });
});

describe('backoff calculation', () => {
  it('should use exponential backoff with jitter', { timeout: 15000 }, async () => {
    // This test verifies that retries happen with increasing delays
    // We measure approximate timing to verify backoff is applied
    let attempts = 0;
    const timestamps: number[] = [];

    const client = new RegistryHttpClient({
      apiKey: 'ulr_test_key_12345',
      retries: 3,
    });

    // Set up failing requests
    nock(DEFAULT_BASE_URL)
      .get('/test')
      .times(3)
      .reply(() => {
        attempts++;
        timestamps.push(Date.now());
        return [503, { error: { message: 'Unavailable' } }];
      });

    await expect(client.get('/test')).rejects.toThrow(ServiceUnavailableError);

    // Verify all retry attempts were made
    expect(attempts).toBe(3);

    // Verify delays increase (exponential backoff)
    if (timestamps.length >= 3) {
      const delay1 = timestamps[1] - timestamps[0];
      const delay2 = timestamps[2] - timestamps[1];
      // Second delay should be roughly 2x the first (with some tolerance for jitter)
      expect(delay2).toBeGreaterThan(delay1 * 1.5);
    }
  });
});
