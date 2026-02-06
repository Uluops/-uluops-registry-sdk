/**
 * Helper utilities for the Registry SDK
 */

/**
 * Sleep for a specified number of milliseconds.
 * @param ms - Duration to sleep in milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Build query string from object, filtering out undefined/null values.
 * @param params - Key-value pairs to serialize
 * @returns Query string prefixed with `?`, or empty string if no params
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      // Handle arrays (e.g., tags)
      for (const item of value) {
        if (item !== undefined && item !== null) {
          searchParams.append(key, String(item));
        }
      }
    } else {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Filter undefined values from an object.
 * @param obj - Source object to filter
 * @returns New object with only defined values
 */
export function filterUndefined<T extends Record<string, unknown>>(
  obj: T
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

/**
 * Deep clone a value using the native structuredClone API.
 * @param obj - Value to clone
 * @returns Deep copy of the input value
 */
export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

/**
 * Parse rate limit headers from response
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

/**
 * Parse rate limit headers from a fetch Response.
 * @param headers - Response headers containing `x-ratelimit-*` values
 * @returns Parsed rate limit info, or `null` if headers are absent/invalid
 */
export function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');
  const retryAfter = headers.get('retry-after');

  if (!limit || !remaining || !reset) {
    return null;
  }

  const parsedLimit = parseInt(limit, 10);
  const parsedRemaining = parseInt(remaining, 10);
  const parsedReset = parseInt(reset, 10);

  if (isNaN(parsedLimit) || isNaN(parsedRemaining) || isNaN(parsedReset)) {
    return null;
  }

  const parsedRetryAfter = retryAfter ? parseInt(retryAfter, 10) : undefined;

  return {
    limit: parsedLimit,
    remaining: parsedRemaining,
    reset: new Date(parsedReset * 1000),
    retryAfter: parsedRetryAfter !== undefined && isNaN(parsedRetryAfter) ? undefined : parsedRetryAfter,
  };
}

/**
 * Check if a value is a plain object (not an array, Date, etc.).
 * @param value - Value to check
 * @returns `true` if the value is a plain `{}` object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Truncate a string to a maximum length, appending `...` if trimmed.
 * @param str - String to truncate
 * @param maxLength - Maximum allowed length (including ellipsis)
 * @returns Original string if within limit, otherwise truncated with `...`
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}
