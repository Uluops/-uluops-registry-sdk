/**
 * Logger utilities for the Registry SDK
 *
 * Re-exports from @uluops/sdk-core with a convenience wrapper.
 */

import { createLogger as coreCreateLogger, type Logger } from '@uluops/sdk-core/utils';

export {
  redactSensitive,
  sanitizeForLog,
  sanitizeForDisplay,
  type Logger,
} from '@uluops/sdk-core/utils';

/**
 * Create a logger instance for the registry SDK.
 *
 * Wraps sdk-core's createLogger with the '[registry-sdk]' prefix.
 */
export function createLogger(enabled: boolean): Logger {
  return coreCreateLogger('[registry-sdk]', enabled);
}
