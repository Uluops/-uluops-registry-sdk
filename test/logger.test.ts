/**
 * Tests for logger utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, redactSensitive, sanitizeForLog } from '../src/utils/logger.js';

describe('redactSensitive', () => {
  it('should redact most of the string showing last 4 characters', () => {
    expect(redactSensitive('ulr_abc123xyz456')).toBe('************z456');
  });

  it('should return [REDACTED] for short strings', () => {
    expect(redactSensitive('abc')).toBe('[REDACTED]');
    expect(redactSensitive('abcd')).toBe('[REDACTED]');
  });

  it('should handle custom showLast parameter', () => {
    expect(redactSensitive('secretvalue', 2)).toBe('*********ue');
  });

  it('should limit asterisks to 20 for very long strings', () => {
    const longString = 'a'.repeat(50);
    const result = redactSensitive(longString);
    expect(result).toBe('********************aaaa');
  });
});

describe('sanitizeForLog', () => {
  it('should redact apiKey fields', () => {
    const result = sanitizeForLog({ apiKey: 'secret123', name: 'test' });
    expect(result).toEqual({ apiKey: '[REDACTED]', name: 'test' });
  });

  it('should redact token and session_token fields', () => {
    const result = sanitizeForLog({ token: 'abc', session_token: 'xyz' });
    expect(result).toEqual({ token: '[REDACTED]', session_token: '[REDACTED]' });
  });

  it('should redact authorization and password fields', () => {
    const result = sanitizeForLog({ authorization: 'Bearer xyz', password: 'secret' });
    expect(result).toEqual({ authorization: '[REDACTED]', password: '[REDACTED]' });
  });

  it('should handle nested objects', () => {
    const result = sanitizeForLog({ config: { apiKey: 'secret', name: 'test' } });
    expect(result).toEqual({ config: { apiKey: '[REDACTED]', name: 'test' } });
  });

  it('should handle arrays', () => {
    const result = sanitizeForLog([{ token: 'abc' }, { name: 'test' }]);
    expect(result).toEqual([{ token: '[REDACTED]' }, { name: 'test' }]);
  });

  it('should pass through primitives', () => {
    expect(sanitizeForLog(42)).toBe(42);
    expect(sanitizeForLog('hello')).toBe('hello');
    expect(sanitizeForLog(null)).toBeNull();
    expect(sanitizeForLog(undefined)).toBeUndefined();
  });

  it('should preserve non-sensitive fields', () => {
    const input = { name: 'test', count: 42, active: true };
    expect(sanitizeForLog(input)).toEqual(input);
  });

  it('should handle case-insensitive key matching', () => {
    const result = sanitizeForLog({ API_KEY: 'secret', Token: 'abc' });
    expect(result).toEqual({ API_KEY: '[REDACTED]', Token: '[REDACTED]' });
  });
});

describe('createLogger', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should suppress debug and info when disabled', () => {
    const logger = createLogger(false);
    logger.debug('test');
    logger.info('test');
    expect(consoleSpy.debug).not.toHaveBeenCalled();
    expect(consoleSpy.info).not.toHaveBeenCalled();
  });

  it('should still emit warn and error when disabled', () => {
    const logger = createLogger(false);
    logger.warn('warning');
    logger.error('error');
    expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    expect(consoleSpy.error).toHaveBeenCalledTimes(1);
  });

  it('should log messages when enabled', () => {
    const logger = createLogger(true);
    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');
    expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
    expect(consoleSpy.info).toHaveBeenCalledTimes(1);
    expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    expect(consoleSpy.error).toHaveBeenCalledTimes(1);
  });

  it('should include prefix and level in output', () => {
    const logger = createLogger(true);
    logger.info('test message');
    const call = consoleSpy.info.mock.calls[0]!;
    expect(call[0]).toMatch(/\[registry-sdk\] INFO:/);
    expect(call[1]).toBe('test message');
  });

  it('should sanitize sensitive data in arguments', () => {
    const logger = createLogger(true);
    logger.debug('request', { apiKey: 'secret123', url: '/test' });
    const call = consoleSpy.debug.mock.calls[0]!;
    expect(call[2]).toEqual({ apiKey: '[REDACTED]', url: '/test' });
  });
});
