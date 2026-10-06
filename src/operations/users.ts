/**
 * User operations for the Registry SDK (read-only)
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type { PublicUser, BatchUserResponse, BatchUserEnvelope, BatchUserOptions } from '../types/users.js';
import { validateUuid } from '../config/validators.js';
import { ValidationError } from '../errors/errors.js';
import { publicUserSchema, batchUserResponseSchema, batchUserEnvelopeSchema } from '../types/response-schemas.js';
import { parseResponse } from '../http/parse-response.js';

/**
 * Get public user information by ID.
 *
 * @param http - Registry HTTP client
 * @param id - User UUID
 * @returns Public user profile (username, name, avatar URL)
 */
export async function get(http: RegistryHttpClient, id: string): Promise<PublicUser> {
  validateUuid(id, 'userId');
  return parseResponse(publicUserSchema, await http.get<PublicUser>(`/users/${id}`, undefined), 'users.get');
}

/**
 * Batch lookup public user information.
 *
 * @param http - Registry HTTP client
 * @param ids - Array of user UUIDs (max 100)
 * @param options - Opt into an envelope with found/missing IDs. Envelope requests
 * normalize UUIDs to lowercase and deduplicate in request order.
 * @returns Map by default, or validated envelope; old producers without metadata fail response validation.
 * @throws {ValidationError} If more than 100 IDs are supplied, or if any ID is not a valid UUID
 */
export function batch(http: RegistryHttpClient, ids: string[], options: { format: 'envelope' }): Promise<BatchUserEnvelope>;
export function batch(http: RegistryHttpClient, ids: string[], options?: { format?: 'map' }): Promise<BatchUserResponse>;
export function batch(http: RegistryHttpClient, ids: string[], options: BatchUserOptions): Promise<BatchUserResponse | BatchUserEnvelope>;
export async function batch(
  http: RegistryHttpClient,
  ids: string[],
  options?: BatchUserOptions
): Promise<BatchUserResponse | BatchUserEnvelope> {
  if (ids.length === 0) {
    return options?.format === 'envelope' ? { data: {}, foundIds: [], missingIds: [] } : {};
  }

  if (ids.length > 100) {
    throw new ValidationError(`Batch lookup supports maximum 100 user IDs (received ${ids.length})`, { field: 'ids', value: ids.length });
  }

  // Validate all IDs
  for (const id of ids) {
    validateUuid(id, 'userId');
  }

  if (options?.format !== 'envelope') {
    return parseResponse(batchUserResponseSchema, await http.post<BatchUserResponse>('/users/batch', { ids }), 'users.batch');
  }

  // UUID identity is case insensitive; the repository returns canonical keys.
  const requestedIds = [...new Set(ids.map((id) => id.toLowerCase()))];
  const requested = new Set(requestedIds);
  const schema = batchUserEnvelopeSchema.superRefine((envelope, ctx) => {
    for (const [id, user] of Object.entries(envelope.data)) {
      if (!requested.has(id) || (user !== null && user.id !== id)) {
        ctx.addIssue({ code: 'custom', path: ['data', id], message: 'User map key/profile must match a requested canonical UUID' });
      }
    }
    const foundIds = requestedIds.filter((id) => envelope.data[id] != null);
    const missingIds = requestedIds.filter((id) => envelope.data[id] == null);
    const notFound = new Set(envelope.notFound);
    if (envelope.found !== foundIds.length) {
      ctx.addIssue({ code: 'custom', path: ['found'], message: 'Found count must match non-null requested profiles' });
    }
    if (notFound.size !== missingIds.length || missingIds.some((id) => !notFound.has(id))) {
      ctx.addIssue({ code: 'custom', path: ['notFound'], message: 'Missing IDs must agree with the requested user map' });
    }
  });
  const envelope = parseResponse(schema, await http.request('POST', '/users/batch', { ids: requestedIds }, { rawEnvelope: true }), 'users.batch');
  return {
    data: envelope.data,
    foundIds: requestedIds.filter((id) => envelope.data[id] != null),
    missingIds: requestedIds.filter((id) => envelope.data[id] == null),
  };
}
