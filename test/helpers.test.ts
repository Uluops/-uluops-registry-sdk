/**
 * Tests for helper utilities
 */

import { describe, it, expect, vi } from 'vitest';
import {
  sleep,
  retry,
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
