/**
 * Test setup and utilities for the Registry SDK
 */

import nock from 'nock';

/**
 * Mock API base URL (explicit test URL, not tied to SDK defaults)
 */
export const MOCK_BASE_URL = 'https://api.uluops.ai/api/v1/registry';

/**
 * Test API key (must be at least 20 chars with ulr_ prefix)
 */
export const TEST_API_KEY = 'ulr_test_key_1234567890';

/**
 * Test JWT session token (valid format: header.payload.signature)
 */
export const TEST_SESSION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QiLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

/**
 * Test user ID
 */
export const TEST_USER_ID = '00000000-0000-4000-a000-000000000001';

/**
 * Enable/disable all nock mocks
 */
export function enableMocks(): void {
  nock.disableNetConnect();
}

export function disableMocks(): void {
  nock.enableNetConnect();
  nock.cleanAll();
}

/**
 * Create a mock endpoint
 */
export function mockEndpoint(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  response: unknown,
  statusCode = 200
): nock.Scope {
  return nock(MOCK_BASE_URL)
    [method](path)
    .reply(statusCode, { data: response });
}

/**
 * Create a mock error response
 */
export function mockError(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  statusCode: number,
  error: { code: string; message: string; details?: Record<string, unknown> }
): nock.Scope {
  return nock(MOCK_BASE_URL)
    [method](path)
    .reply(statusCode, { error });
}

/**
 * Create a mock with custom headers
 */
export function mockWithHeaders(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  response: unknown,
  headers: Record<string, string>,
  statusCode = 200
): nock.Scope {
  return nock(MOCK_BASE_URL)
    [method](path)
    .reply(statusCode, { data: response }, headers);
}

// Setup global test hooks
beforeEach(() => {
  nock.cleanAll(); // Ensure no stale interceptors from previous test
  enableMocks();

  // Clear ULUOPS_ env vars to prevent tests from picking up real credentials
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('ULUOPS_')) {
      delete process.env[key];
    }
  }
});

afterEach(() => {
  disableMocks();
});
