/**
 * Response validation helper.
 *
 * Every operation routes its decoded HTTP response through `parseResponse`
 * instead of calling `schema.parse()` directly. On a schema mismatch this
 * throws {@link ResponseValidationError} (a `RegistryApiError` subclass) rather
 * than a raw `ZodError`, so response-contract drift stays inside the SDK's
 * documented error hierarchy and is catchable via `isRegistryApiError()`.
 */

import type { ZodTypeAny, z } from 'zod';
import { ResponseValidationError } from '../errors/errors.js';

/**
 * Validate `data` against `schema`, returning the typed result.
 *
 * @param schema - The Zod schema for the expected response shape
 * @param data - The decoded HTTP response body
 * @param context - Optional operation label (e.g. `'definitions.get'`) surfaced
 *   in the error message to pinpoint which call drifted
 * @returns The parsed, typed response
 * @throws {ResponseValidationError} If `data` does not match `schema`
 */
export function parseResponse<S extends ZodTypeAny>(
  schema: S,
  data: unknown,
  context?: string,
): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ResponseValidationError(result.error, context);
  }
  return result.data;
}
