/**
 * Tests for HTTP client including retry logic, timeout handling, and error transformation
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
  NetworkError,
} from '../src/errors/errors.js';
import { mockEndpoint, mockError, mockWithHeaders, TEST_API_KEY, MOCK_BASE_URL } from './setup.js';

describe('RegistryHttpClient', () => {
  let client: RegistryHttpClient;

  beforeEach(() => {
    client = new RegistryHttpClient({
      apiKey: TEST_API_KEY,
      retries: 3,
      timeout: 5000,
    });
  });

  describe('basic requests', () => {
    it('should make GET requests', async () => {
      mockEndpoint('get', '/test', { message: 'success' });

      const result = await client.get<{ message: string }>('/test');
      expect(result.message).toBe('success');
    });

    it('should make POST requests with body', async () => {
      nock(MOCK_BASE_URL)
        .post('/test', { name: 'test' })
        .reply(201, { data: { id: '123' } });

      const result = await client.post<{ id: string }>('/test', { name: 'test' });
      expect(result.id).toBe('123');
    });

    it('should make PUT requests', async () => {
      nock(MOCK_BASE_URL)
        .put('/test/123', { name: 'updated' })
        .reply(200, { data: { id: '123', name: 'updated' } });

      const result = await client.put<{ id: string; name: string }>('/test/123', {
        name: 'updated',
      });
      expect(result.name).toBe('updated');
    });

    it('should make DELETE requests', async () => {
      mockEndpoint('delete', '/test/123', { deleted: true });

      const result = await client.delete<{ deleted: boolean }>('/test/123');
      expect(result.deleted).toBe(true);
    });

    it('should include query parameters for GET requests', async () => {
      nock(MOCK_BASE_URL)
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
      nock(MOCK_BASE_URL)
        .get('/test')
        .matchHeader('Authorization', `Bearer ${TEST_API_KEY}`)
        .reply(200, { data: { authenticated: true } });

      const result = await client.get<{ authenticated: boolean }>('/test');
      expect(result.authenticated).toBe(true);
    });

    it('should include X-Org-Slug header when orgSlug is configured', async () => {
      const orgClient = new RegistryHttpClient({
        apiKey: TEST_API_KEY,
        orgSlug: 'my-org',
      });

      nock(MOCK_BASE_URL)
        .get('/test')
        .matchHeader('X-Org-Slug', 'my-org')
        .reply(200, { data: { ok: true } });

      const result = await orgClient.get<{ ok: boolean }>('/test');
      expect(result.ok).toBe(true);
    });

    it('should not include X-Org-Slug header when orgSlug is omitted', async () => {
      let capturedHeaders: Record<string, string | string[]> = {};
      nock(MOCK_BASE_URL)
        .get('/test')
        .reply(function () {
          capturedHeaders = this.req.headers;
          return [200, JSON.stringify({ data: { ok: true } }), { 'content-type': 'application/json' }];
        });

      await client.get<{ ok: boolean }>('/test');
      expect(capturedHeaders['x-org-slug']).toBeUndefined();
    });
  });

  describe('error transformation', () => {
    it('should transform 400 to ValidationError', async () => {
      mockError('get', '/test', 400, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { field: 'name' },
      });

      await expect(client.get('/test')).rejects.toThrow(ValidationError);
    });

    it('should transform 401 to UnauthorizedError', async () => {
      mockError('get', '/test', 401, { code: 'UNAUTHORIZED', message: 'Invalid token' });

      await expect(client.get('/test')).rejects.toThrow(UnauthorizedError);
    });

    it('should transform 403 to ForbiddenError', async () => {
      mockError('get', '/test', 403, { code: 'FORBIDDEN', message: 'Access denied' });

      await expect(client.get('/test')).rejects.toThrow(ForbiddenError);
    });

    it('should transform 404 to NotFoundError', async () => {
      mockError('get', '/test', 404, { code: 'NOT_FOUND', message: 'Resource not found' });

      await expect(client.get('/test')).rejects.toThrow(NotFoundError);
    });

    it('should transform 409 to ConflictError', async () => {
      mockError('get', '/test', 409, { code: 'CONFLICT', message: 'Already exists' });

      await expect(client.get('/test')).rejects.toThrow(ConflictError);
    });

    it('should transform 413 to PayloadTooLargeError', async () => {
      mockError('post', '/test', 413, { code: 'PAYLOAD_TOO_LARGE', message: 'Too large' });

      await expect(client.post('/test', {})).rejects.toThrow(PayloadTooLargeError);
    });

    it('should transform 422 to UnprocessableError', async () => {
      mockError('post', '/test', 422, { code: 'UNPROCESSABLE_ENTITY', message: 'Invalid YAML' });

      await expect(client.post('/test', {})).rejects.toThrow(UnprocessableError);
    });

    it('should transform 429 to RateLimitError with retry-after', { timeout: 15000 }, async () => {
      // Use .times(3) because 429 is retryable and client retries 3 times by default.
      // retry-after: 1 (second) keeps the test fast now that backoff respects the header.
      nock(MOCK_BASE_URL)
        .get('/test')
        .times(3)
        .reply(
          429,
          { error: { code: 'RATE_LIMIT_ERROR', message: 'Rate limited' } },
          { 'retry-after': '1' }
        );

      try {
        await client.get('/test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).retryAfter).toBe(1);
      }
    });

    it('should transform 503 to ServiceUnavailableError', { timeout: 15000 }, async () => {
      // Use .times(3) because 503 is retryable and client retries 3 times by default
      nock(MOCK_BASE_URL)
        .get('/test')
        .times(3)
        .reply(503, { error: { code: 'SERVICE_UNAVAILABLE', message: 'Unavailable' } });

      await expect(client.get('/test')).rejects.toThrow(ServiceUnavailableError);
    });

    it('should strip server-internal details from error responses', async () => {
      nock(MOCK_BASE_URL)
        .get('/test')
        .reply(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: {
              field: 'name',
              reason: 'too short',
              stack: 'Error: at Server.handler (/app/src/routes.ts:42)',
              sql: 'SELECT * FROM users WHERE id = $1',
              internal: { serverPath: '/opt/app' },
            },
          },
        });

      try {
        await client.get('/test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const details = (error as ValidationError).details;
        expect(details).toHaveProperty('field', 'name');
        expect(details).toHaveProperty('reason', 'too short');
        expect(details).not.toHaveProperty('stack');
        expect(details).not.toHaveProperty('sql');
        expect(details).not.toHaveProperty('internal');
      }
    });

    it('should include request ID from headers', async () => {
      nock(MOCK_BASE_URL)
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
    it('should retry on 502 Bad Gateway', { timeout: 15000 }, async () => {
      let attempts = 0;
      nock(MOCK_BASE_URL)
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
      nock(MOCK_BASE_URL)
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
      nock(MOCK_BASE_URL)
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
      nock(MOCK_BASE_URL)
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
      nock(MOCK_BASE_URL)
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
      nock(MOCK_BASE_URL)
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
      nock(MOCK_BASE_URL)
        .get('/test')
        .reply(() => {
          attempts++;
          return [404, { error: { message: 'Not Found' } }];
        });

      await expect(client.get('/test')).rejects.toThrow(NotFoundError);
      expect(attempts).toBe(1);
    });

    it('should stop retrying after max attempts', { timeout: 15000 }, async () => {
      let attempts = 0;
      nock(MOCK_BASE_URL)
        .get('/test')
        .times(3)
        .reply(() => {
          attempts++;
          return [503, { error: { message: 'Service Unavailable' } }];
        });

      await expect(client.get('/test')).rejects.toThrow(ServiceUnavailableError);
      expect(attempts).toBe(3);
    });

    it('should NOT retry POST requests by default', async () => {
      let attempts = 0;
      nock(MOCK_BASE_URL)
        .post('/test')
        .reply(() => {
          attempts++;
          return [503, { error: { message: 'Service Unavailable' } }];
        });

      await expect(client.post('/test', { name: 'test' })).rejects.toThrow(ServiceUnavailableError);
      expect(attempts).toBe(1);
    });

    it('should NOT retry PUT requests by default', async () => {
      let attempts = 0;
      nock(MOCK_BASE_URL)
        .put('/test/123')
        .reply(() => {
          attempts++;
          return [503, { error: { message: 'Service Unavailable' } }];
        });

      await expect(client.put('/test/123', { name: 'updated' })).rejects.toThrow(ServiceUnavailableError);
      expect(attempts).toBe(1);
    });

    it('should NOT retry DELETE requests by default', async () => {
      let attempts = 0;
      nock(MOCK_BASE_URL)
        .delete('/test/123')
        .reply(() => {
          attempts++;
          return [503, { error: { message: 'Service Unavailable' } }];
        });

      await expect(client.delete('/test/123')).rejects.toThrow(ServiceUnavailableError);
      expect(attempts).toBe(1);
    });

    it('should retry POST when retryMutations is true', async () => {
      let attempts = 0;
      nock(MOCK_BASE_URL)
        .post('/test')
        .times(1)
        .reply(() => {
          attempts++;
          return [503, { error: { message: 'Service Unavailable' } }];
        })
        .post('/test')
        .reply(201, { data: { id: '123' } });

      const result = await client.request<{ id: string }>('POST', '/test', { name: 'test' }, { retryMutations: true });
      expect(result.id).toBe('123');
      expect(attempts).toBe(1);
    });

    it('should retry PUT when retryMutations is true', async () => {
      let attempts = 0;
      nock(MOCK_BASE_URL)
        .put('/test/123')
        .times(1)
        .reply(() => {
          attempts++;
          return [503, { error: { message: 'Service Unavailable' } }];
        })
        .put('/test/123')
        .reply(200, { data: { id: '123', name: 'updated' } });

      const result = await client.request<{ id: string }>('PUT', '/test/123', { name: 'updated' }, { retryMutations: true });
      expect(result.id).toBe('123');
      expect(attempts).toBe(1);
    });

    it('should retry DELETE when retryMutations is true', async () => {
      let attempts = 0;
      nock(MOCK_BASE_URL)
        .delete('/test/123')
        .times(1)
        .reply(() => {
          attempts++;
          return [503, { error: { message: 'Service Unavailable' } }];
        })
        .delete('/test/123')
        .reply(200, { data: { deleted: true } });

      const result = await client.request<{ deleted: boolean }>('DELETE', '/test/123', undefined, { retryMutations: true });
      expect(result.deleted).toBe(true);
      expect(attempts).toBe(1);
    });

    it('should NOT retry mutations on non-retryable errors even with retryMutations', async () => {
      let attempts = 0;
      nock(MOCK_BASE_URL)
        .post('/test')
        .reply(() => {
          attempts++;
          return [400, { error: { code: 'VALIDATION_ERROR', message: 'Bad Request' } }];
        });

      await expect(
        client.request('POST', '/test', { name: 'test' }, { retryMutations: true })
      ).rejects.toThrow(ValidationError);
      expect(attempts).toBe(1);
    });

    it('should exhaust all attempts for mutations with retryMutations', { timeout: 15000 }, async () => {
      let attempts = 0;
      nock(MOCK_BASE_URL)
        .post('/test')
        .times(3)
        .reply(() => {
          attempts++;
          return [503, { error: { message: 'Service Unavailable' } }];
        });

      await expect(
        client.request('POST', '/test', { name: 'test' }, { retryMutations: true })
      ).rejects.toThrow(ServiceUnavailableError);
      expect(attempts).toBe(3);
    });

    it('should not retry when retries is 1 (single attempt)', async () => {
      const singleAttemptClient = new RegistryHttpClient({
        apiKey: TEST_API_KEY,
        retries: 1,
      });

      let attempts = 0;
      nock(MOCK_BASE_URL)
        .get('/test')
        .reply(() => {
          attempts++;
          return [503, { error: { message: 'Service Unavailable' } }];
        });

      await expect(singleAttemptClient.get('/test')).rejects.toThrow('Service Unavailable');
      expect(attempts).toBe(1);
    });

    it('should override default retries with per-request option', async () => {
      // Client has 3 retries, but request overrides to 1
      let attempts = 0;
      nock(MOCK_BASE_URL)
        .get('/test')
        .reply(() => {
          attempts++;
          return [503, { error: { message: 'Service Unavailable' } }];
        });

      await expect(
        client.request('GET', '/test', undefined, { retries: 1 })
      ).rejects.toThrow('Service Unavailable');
      expect(attempts).toBe(1);
    });

    it('should respect custom retry count', { timeout: 30000 }, async () => {
      let attempts = 0;
      const customClient = new RegistryHttpClient({
        apiKey: TEST_API_KEY,
        retries: 5,
      });

      nock(MOCK_BASE_URL)
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

  describe('network error handling', () => {
    it('should throw NetworkError on ECONNREFUSED', async () => {
      nock(MOCK_BASE_URL)
        .get('/test')
        .times(3)
        .replyWithError({ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' });

      await expect(client.get('/test')).rejects.toThrow(NetworkError);
    });

    it('should throw NetworkError on ECONNRESET', async () => {
      nock(MOCK_BASE_URL)
        .get('/test')
        .times(3)
        .replyWithError({ code: 'ECONNRESET', message: 'socket hang up' });

      await expect(client.get('/test')).rejects.toThrow(NetworkError);
    });

    it('should include base URL in NetworkError message', async () => {
      nock(MOCK_BASE_URL)
        .get('/test')
        .times(3)
        .replyWithError({ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' });

      try {
        await client.get('/test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
        expect((error as NetworkError).message).toContain(MOCK_BASE_URL);
      }
    });
  });

  describe('timeout handling', () => {
    /** Short timeout so the test triggers an abort quickly */
    const SHORT_TIMEOUT_MS = 100;
    /** Response delay that exceeds SHORT_TIMEOUT_MS to trigger timeout */
    const SLOW_RESPONSE_DELAY_MS = 500;
    /** Response delay that stays within the default client timeout */
    const FAST_RESPONSE_DELAY_MS = 50;

    it('should timeout slow requests', async () => {
      const shortTimeoutClient = new RegistryHttpClient({
        apiKey: TEST_API_KEY,
        timeout: SHORT_TIMEOUT_MS,
        retries: 1,
      });

      nock(MOCK_BASE_URL)
        .get('/slow')
        .delay(SLOW_RESPONSE_DELAY_MS)
        .reply(200, { data: { success: true } });

      await expect(shortTimeoutClient.get('/slow')).rejects.toThrow(TimeoutError);
    });

    it('should complete requests within timeout', async () => {
      nock(MOCK_BASE_URL)
        .get('/fast')
        .delay(FAST_RESPONSE_DELAY_MS)
        .reply(200, { data: { success: true } });

      const result = await client.get<{ success: boolean }>('/fast');
      expect(result.success).toBe(true);
    });
  });

  describe('rate limit info', () => {
    it('should parse rate limit headers', async () => {
      nock(MOCK_BASE_URL)
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
      nock(MOCK_BASE_URL)
        .get('/test')
        .reply(200, { data: { success: true } });

      await client.get('/test');
      const rateLimitInfo = client.getRateLimitInfo();

      expect(rateLimitInfo).toBeNull();
    });
  });

  describe('response envelope validation', () => {
    it('should throw on response without data wrapper', async () => {
      nock(MOCK_BASE_URL)
        .get('/test')
        .reply(200, { items: [] });

      await expect(client.get('/test')).rejects.toThrow('Unexpected API response format');
    });

    it('should throw on null response body', async () => {
      nock(MOCK_BASE_URL)
        .get('/test')
        .reply(200, null);

      await expect(client.get('/test')).rejects.toThrow();
    });
  });

  describe('requestRaw', () => {
    it('should return raw response without unwrapping', async () => {
      nock(MOCK_BASE_URL)
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

      nock(MOCK_BASE_URL)
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

    it('should throw NetworkError with credential hint when no credentials and server unreachable', async () => {
      // Allow real connections so fetch throws a genuine TypeError
      nock.enableNetConnect('localhost:19999');

      const unauthClient = new RegistryHttpClient({
        baseUrl: 'http://localhost:19999', // unreachable port
        retries: 1,
        timeout: 2000,
      });

      try {
        await unauthClient.get('/test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
        expect((error as NetworkError).message).toContain('No credentials configured');
      }
    });

    it('should throw actionable UnauthorizedError when no credentials and server returns 401', async () => {
      const unauthClient = new RegistryHttpClient();

      nock(MOCK_BASE_URL)
        .get('/protected')
        .reply(401, { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });

      try {
        await unauthClient.get('/protected');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).message).toContain('ULUOPS_API_KEY');
        expect((error as UnauthorizedError).message).toContain('apiKey');
      }
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
      apiKey: TEST_API_KEY,
      retries: 3,
    });

    // Set up failing requests
    nock(MOCK_BASE_URL)
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
    expect(timestamps).toHaveLength(3);
    const delay1 = timestamps[1]! - timestamps[0]!;
    const delay2 = timestamps[2]! - timestamps[1]!;
    // Second delay should be roughly 2x the first (with some tolerance for jitter)
    expect(delay2).toBeGreaterThan(delay1 * 1.5);
  });
});
