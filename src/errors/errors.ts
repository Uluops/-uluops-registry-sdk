/**
 * Error hierarchy for the Registry SDK
 *
 * Re-exports from @uluops/sdk-core with registry-sdk-specific aliases.
 */

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
  isTimeoutError,
} from '@uluops/sdk-core/errors';

export {
  ResponseValidationError,
  isResponseValidationError,
} from '@uluops/sdk-core';
