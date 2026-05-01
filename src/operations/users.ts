/**
 * User operations for the Registry SDK (read-only)
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type { PublicUser, BatchUserResponse } from '../types/users.js';
import { validateUuid } from '../config/validators.js';
import { publicUserSchema, batchUserResponseSchema } from '../types/response-schemas.js';

/**
 * Get public user information by ID
 */
export async function get(http: RegistryHttpClient, id: string): Promise<PublicUser> {
  validateUuid(id, 'userId');
  return http.get<PublicUser>(`/users/${id}`, undefined, { schema: publicUserSchema });
}

/**
 * Batch lookup public user information
 * @param ids Array of user IDs (max 100)
 */
export async function batch(
  http: RegistryHttpClient,
  ids: string[]
): Promise<BatchUserResponse> {
  if (ids.length === 0) {
    return {};
  }

  if (ids.length > 100) {
    throw new Error(`Batch lookup supports maximum 100 user IDs (received ${ids.length})`);
  }

  // Validate all IDs
  for (const id of ids) {
    validateUuid(id, 'userId');
  }

  return http.post<BatchUserResponse>('/users/batch', { ids }, { schema: batchUserResponseSchema });
}
