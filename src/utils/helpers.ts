/**
 * Helper utilities for the Registry SDK
 *
 * Shared helpers are re-exported from @uluops/sdk-core.
 * SDK-specific helpers remain here.
 */

// Re-export shared helpers from sdk-core
export {
  sleep,
  retry,
  truncate,
  isPlainObject,
  parseRateLimitHeaders,
  type RateLimitInfo,
} from '@uluops/sdk-core/utils';

// --- SDK-specific helpers ---

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
