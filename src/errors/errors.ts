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

  constructor(zodError: ZodError, context?: string, mutation?: { applicationState: 'unknown'; recoveryAction: string }) {
    super(
      0,
      `Registry API response failed schema validation${context ? `: ${context}` : ''}`,
      'RESPONSE_VALIDATION',
      { issues: zodError.issues, ...mutation },
    );
    this.name = 'ResponseValidationError';
    this.zodError = zodError;
  }
}

/** The requested quality contract cannot be served without changing its meaning. */
export class UnsupportedQualityContractError extends SdkApiError {
  constructor() {
    super(0, 'Server does not support the requested nullable-v1 quality contract', 'UNSUPPORTED_CONTRACT');
    this.name = 'UnsupportedQualityContractError';
  }
}

/** Selected diff contract is unsupported; no legacy fallback is performed. */
export class UnsupportedDiffContractError extends SdkApiError {
  constructor() {
    super(0, 'The Registry API does not support diffContract=combined-v1.', 'UNSUPPORTED_DIFF_CONTRACT');
    this.name = 'UnsupportedDiffContractError';
  }
}

/** A refused definition lifecycle transition. No mutation was applied. */
export interface InvalidTransitionDetails {
  allowedTransitions: string[];
  applicationState: 'not_applied';
}

/** Narrow an API error to an unapplied status transition and its allowed next statuses. */
export function isInvalidTransitionError(err: unknown): err is SdkApiError & { details: InvalidTransitionDetails } {
  if (!(err instanceof SdkApiError) || err.code !== 'INVALID_TRANSITION') return false;
  const details = err.details as Partial<InvalidTransitionDetails> | undefined;
  return Array.isArray(details?.allowedTransitions)
    && details.allowedTransitions.every((value) => typeof value === 'string')
    && details.applicationState === 'not_applied';
}

/** A definition still has references; the server discloses presence only, not identities or counts. */
export interface DeleteBlockedDetails {
  reason: 'definition_has_blockers';
  blockingResources: { present: true };
  applicationState: 'not_applied';
  recoveryAction: string;
}

/** Narrow a blocked delete without exposing referenced definitions or their owners. */
export function isDeleteBlockedError(err: unknown): err is SdkApiError & { details: DeleteBlockedDetails } {
  if (!(err instanceof SdkApiError) || err.code !== 'DELETE_BLOCKED') return false;
  const details = err.details as Partial<DeleteBlockedDetails> | undefined;
  return details?.reason === 'definition_has_blockers'
    && details.blockingResources?.present === true
    && details.applicationState === 'not_applied'
    && typeof details.recoveryAction === 'string';
}

/** Selected definition search contract is unsupported; no legacy fallback is performed. */
export class UnsupportedDefinitionSearchContractError extends SdkApiError {
  constructor() {
    super(0, 'The Registry API does not support the name-v1 definition search contract.', 'UNSUPPORTED_DEFINITION_SEARCH_CONTRACT');
    this.name = 'UnsupportedDefinitionSearchContractError';
  }
}
