/**
 * Simple debug logger interface for the Registry SDK
 */

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Create a logger instance
 */
export function createLogger(enabled: boolean): Logger {
  const noop = () => {};

  if (!enabled) {
    return {
      debug: noop,
      info: noop,
      warn: noop,
      error: noop,
    };
  }

  const prefix = '[registry-sdk]';
  const timestamp = () => new Date().toISOString();

  const sanitizeArgs = (args: unknown[]): unknown[] => args.map(sanitizeForLog);

  return {
    debug(message: string, ...args: unknown[]): void {
      console.debug(`${timestamp()} ${prefix} DEBUG:`, message, ...sanitizeArgs(args));
    },
    info(message: string, ...args: unknown[]): void {
      console.info(`${timestamp()} ${prefix} INFO:`, message, ...sanitizeArgs(args));
    },
    warn(message: string, ...args: unknown[]): void {
      console.warn(`${timestamp()} ${prefix} WARN:`, message, ...sanitizeArgs(args));
    },
    error(message: string, ...args: unknown[]): void {
      console.error(`${timestamp()} ${prefix} ERROR:`, message, ...sanitizeArgs(args));
    },
  };
}

/**
 * Redact sensitive values for safe logging
 * Shows only the last N characters
 */
export function redactSensitive(value: string, showLast = 4): string {
  if (value.length <= showLast) {
    return '[REDACTED]';
  }
  return `${'*'.repeat(Math.min(value.length - showLast, 20))}${value.slice(-showLast)}`;
}

const SENSITIVE_KEYS = /^(api[_-]?key|token|session[_-]?token|secret|password|authorization|credentials|cookie)$/i;

/**
 * Sanitize an object for safe logging by redacting sensitive fields
 */
export function sanitizeForLog(value: unknown): unknown {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeForLog);
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.test(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      result[key] = sanitizeForLog(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}
