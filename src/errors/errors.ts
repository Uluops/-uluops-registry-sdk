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
  isNotFoundError,
  isConflictError,
  isUnprocessableError,
  isRateLimitError,
} from '@uluops/sdk-core/errors';
