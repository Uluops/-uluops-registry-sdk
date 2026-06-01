/**
 * User operations for the Registry SDK (read-only)
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type { PublicUser, BatchUserResponse } from '../types/users.js';
import { validateUuid } from '../config/validators.js';
import { ValidationError } from '../errors/errors.js';
import { publicUserSchema, batchUserResponseSchema } from '../types/response-schemas.js';

/**
 * Get public user information by ID.
 *
 * @param http - Registry HTTP client
 * @param id - User UUID
 * @returns Public user profile (username, name, avatar URL)
 */
export async function get(http: RegistryHttpClient, id: string): Promise<PublicUser> {
  validateUuid(id, 'userId');
  return publicUserSchema.parse(await http.get<PublicUser>(`/users/${id}`, undefined));
}

/**
 * Batch lookup public user information.
 *
 * @param http - Registry HTTP client
 * @param ids - Array of user UUIDs (max 100)
 * @returns Map of user ID to public user profile
 */
export async function batch(
  http: RegistryHttpClient,
  ids: string[]
): Promise<BatchUserResponse> {
  if (ids.length === 0) {
    return {};
  }

  if (ids.length > 100) {
    throw new ValidationError(`Batch lookup supports maximum 100 user IDs (received ${ids.length})`, { field: 'ids', value: ids.length });
  }

  // Validate all IDs
  for (const id of ids) {
    validateUuid(id, 'userId');
  }

  return batchUserResponseSchema.parse(await http.post<BatchUserResponse>('/users/batch', { ids }));
}
