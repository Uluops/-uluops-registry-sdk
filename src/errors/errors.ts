/**
 * Error hierarchy for the Registry SDK
 *
 * Re-exports from @uluops/sdk-core with registry-sdk-specific aliases,
 * plus the registry-sdk-local `ResponseValidationError`.
 */

import { SdkApiError } from '@uluops/sdk-core/errors';
import type { ZodError } from 'zod';

export {
  SdkApiError as RegistryApiError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  PayloadTooLargeError,
  UnprocessableError,
  RateLimitError,
  ServiceUnavailableError,
  NetworkError,
  RedirectError,
  TimeoutError,
  createErrorFromStatus,
  isSdkApiError as isRegistryApiError,
  isValidationError,
  isUnauthorizedError,
  isForbiddenError,
  isNotFoundError,
  isConflictError,
  isPayloadTooLargeError,
  isUnprocessableError,
  isRateLimitError,
  isServiceUnavailableError,
  isNetworkError,
  isRedirectError,
  isTimeoutError,
} from '@uluops/sdk-core/errors';

/**
 * Thrown when a Registry API response does not match the SDK's expected Zod
 * schema (API contract drift, partial outage returning malformed bodies, etc.).
 *
 * Extends {@link RegistryApiError} (`SdkApiError`), so it is caught by
 * `isRegistryApiError()` and any `catch (e) { if (e instanceof RegistryApiError) }`
 * block — response-validation failures no longer escape the error hierarchy as
 * raw `ZodError`. The original `ZodError` is preserved on `.zodError` for callers
 * that need field-level detail.
 *
 * `statusCode` is `0` (the response was received but failed client-side
 * validation) and the error is non-retryable.
 *
 * @example
 * ```typescript
 * import { ResponseValidationError, isRegistryApiError } from '@uluops/registry-sdk/errors';
 *
 * try {
 *   await client.definitions.get('agent', 'my-agent', '1.0.0');
 * } catch (err) {
 *   if (err instanceof ResponseValidationError) {
 *     console.error('Response shape drifted:', err.zodError.issues);
 *   } else if (isRegistryApiError(err)) {
 *     console.error(err.code, err.statusCode);
 *   }
 * }
 * ```
 */
export class ResponseValidationError extends SdkApiError {
  /** The underlying Zod validation error, with per-field `.issues`. */
  readonly zodError: ZodError;

  constructor(zodError: ZodError, context?: string) {
    super(
      0,
      `Registry API response failed schema validation${context ? `: ${context}` : ''}`,
      'RESPONSE_VALIDATION',
      { issues: zodError.issues },
    );
    this.name = 'ResponseValidationError';
    this.zodError = zodError;
  }
}
