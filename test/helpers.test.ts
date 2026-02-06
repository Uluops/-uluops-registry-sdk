/**
 * Tests for helper utilities
 */

import { describe, it, expect, vi } from 'vitest';
import {
  sleep,
  retry,
  buildQueryString,
  filterUndefined,
  deepClone,
  isPlainObject,
  truncate,
  parseRateLimitHeaders,
} from '../src/utils/helpers.js';

describe('sleep', () => {
  it('should resolve after the specified delay', async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  it('should resolve immediately for 0ms', async () => {
    const start = Date.now();
    await sleep(0);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});

describe('retry', () => {
  it('should return result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await retry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');
    const result = await retry(fn, { baseDelayMs: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(
      retry(fn, { maxRetries: 3, baseDelayMs: 10 })
    ).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should respect shouldRetry predicate', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('not retryable'));
    await expect(
      retry(fn, { maxRetries: 3, baseDelayMs: 10, shouldRetry: () => false })
    ).rejects.toThrow('not retryable');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should respect maxDelayMs cap', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');

    const start = Date.now();
    await retry(fn, { baseDelayMs: 100, maxDelayMs: 150, maxRetries: 3 });
    const elapsed = Date.now() - start;
    // 2 retries: delay1=100ms, delay2=min(200,150)=150ms => total ~250ms
    expect(elapsed).toBeLessThan(500);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should use default options', async () => {
    const fn = vi.fn().mockResolvedValue(42);
    const result = await retry(fn);
    expect(result).toBe(42);
  });
});

describe('buildQueryString', () => {
  it('should build query string from object', () => {
    expect(buildQueryString({ type: 'agent', limit: 10 })).toBe('?type=agent&limit=10');
  });

  it('should filter out undefined values', () => {
    expect(buildQueryString({ type: 'agent', status: undefined })).toBe('?type=agent');
  });

  it('should filter out null values', () => {
    expect(buildQueryString({ type: 'agent', status: null })).toBe('?type=agent');
  });

  it('should handle arrays', () => {
    const qs = buildQueryString({ tag: ['ai', 'ml'] });
    expect(qs).toContain('tag=ai');
    expect(qs).toContain('tag=ml');
  });

  it('should handle arrays with null/undefined items', () => {
    const qs = buildQueryString({ tag: ['ai', undefined, null, 'ml'] });
    expect(qs).toContain('tag=ai');
    expect(qs).toContain('tag=ml');
    expect(qs).not.toContain('undefined');
    expect(qs).not.toContain('null');
  });

  it('should return empty string for empty object', () => {
    expect(buildQueryString({})).toBe('');
  });

  it('should return empty string when all values are undefined', () => {
    expect(buildQueryString({ a: undefined, b: null })).toBe('');
  });

  it('should convert numbers to strings', () => {
    expect(buildQueryString({ offset: 0 })).toBe('?offset=0');
  });

  it('should convert booleans to strings', () => {
    expect(buildQueryString({ active: true })).toBe('?active=true');
  });
});

describe('filterUndefined', () => {
  it('should remove undefined values', () => {
    const result = filterUndefined({ a: 1, b: undefined, c: 'hello' });
    expect(result).toEqual({ a: 1, c: 'hello' });
  });

  it('should keep null values', () => {
    const result = filterUndefined({ a: 1, b: null });
    expect(result).toEqual({ a: 1, b: null });
  });

  it('should keep falsy values (0, empty string, false)', () => {
    const result = filterUndefined({ a: 0, b: '', c: false });
    expect(result).toEqual({ a: 0, b: '', c: false });
  });

  it('should return empty object for all undefined', () => {
    const result = filterUndefined({ a: undefined, b: undefined });
    expect(result).toEqual({});
  });

  it('should return empty object for empty input', () => {
    const result = filterUndefined({});
    expect(result).toEqual({});
  });
});

describe('deepClone', () => {
  it('should clone primitive values', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('hello')).toBe('hello');
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBeNull();
  });

  it('should deep clone objects', () => {
    const original = { a: 1, b: { c: 2 } };
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.b).not.toBe(original.b);
  });

  it('should deep clone arrays', () => {
    const original = [1, [2, 3], { a: 4 }];
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned[1]).not.toBe(original[1]);
    expect(cloned[2]).not.toBe(original[2]);
  });

  it('should handle nested objects', () => {
    const original = { a: { b: { c: { d: 'deep' } } } };
    const cloned = deepClone(original);
    expect(cloned.a.b.c.d).toBe('deep');
    cloned.a.b.c.d = 'modified';
    expect(original.a.b.c.d).toBe('deep');
  });

  it('should handle deeply nested objects', () => {
    let obj: Record<string, unknown> = { value: 'bottom' };
    for (let i = 0; i < 55; i++) {
      obj = { nested: obj };
    }
    const cloned = deepClone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
  });

  it('should clone empty objects and arrays', () => {
    expect(deepClone({})).toEqual({});
    expect(deepClone([])).toEqual([]);
  });
});

describe('isPlainObject', () => {
  it('should return true for plain objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
  });

  it('should return false for arrays', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject([1, 2])).toBe(false);
  });

  it('should return false for null', () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it('should return false for primitives', () => {
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject('string')).toBe(false);
    expect(isPlainObject(true)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
  });

  it('should return false for class instances', () => {
    expect(isPlainObject(new Date())).toBe(false);
    expect(isPlainObject(new Map())).toBe(false);
    expect(isPlainObject(/regex/)).toBe(false);
  });
});

describe('truncate', () => {
  it('should not truncate strings within limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('should truncate long strings with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('should handle exact length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('should handle very short maxLength', () => {
    expect(truncate('hello world', 3)).toBe('...');
  });

  it('should handle empty string', () => {
    expect(truncate('', 10)).toBe('');
  });
});

describe('parseRateLimitHeaders', () => {
  function createHeaders(headers: Record<string, string>): Headers {
    return new Headers(headers);
  }

  it('should parse valid rate limit headers', () => {
    const headers = createHeaders({
      'x-ratelimit-limit': '100',
      'x-ratelimit-remaining': '95',
      'x-ratelimit-reset': '1700000000',
    });

    const info = parseRateLimitHeaders(headers);
    expect(info).not.toBeNull();
    expect(info!.limit).toBe(100);
    expect(info!.remaining).toBe(95);
    expect(info!.reset).toEqual(new Date(1700000000 * 1000));
    expect(info!.retryAfter).toBeUndefined();
  });

  it('should include retry-after when present', () => {
    const headers = createHeaders({
      'x-ratelimit-limit': '100',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': '1700000000',
      'retry-after': '60',
    });

    const info = parseRateLimitHeaders(headers);
    expect(info!.retryAfter).toBe(60);
  });

  it('should return null when limit header is missing', () => {
    const headers = createHeaders({
      'x-ratelimit-remaining': '95',
      'x-ratelimit-reset': '1700000000',
    });

    expect(parseRateLimitHeaders(headers)).toBeNull();
  });

  it('should return null when remaining header is missing', () => {
    const headers = createHeaders({
      'x-ratelimit-limit': '100',
      'x-ratelimit-reset': '1700000000',
    });

    expect(parseRateLimitHeaders(headers)).toBeNull();
  });

  it('should return null when reset header is missing', () => {
    const headers = createHeaders({
      'x-ratelimit-limit': '100',
      'x-ratelimit-remaining': '95',
    });

    expect(parseRateLimitHeaders(headers)).toBeNull();
  });

  it('should return null for empty headers', () => {
    const headers = createHeaders({});
    expect(parseRateLimitHeaders(headers)).toBeNull();
  });
});
