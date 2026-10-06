/**
 * User types for the Registry SDK
 */

/**
 * Public user information (excludes sensitive data)
 */
export interface PublicUser {
  id: string;
  username?: string | null;
  name?: string | null;
  bio?: string | null;
  websiteUrl?: string | null;
  avatar?: string | null;
  avatarMimeType?: string | null;
}

/**
 * Batch user lookup response
 */
export interface BatchUserResponse {
  [userId: string]: PublicUser | null | undefined;
}

/** Opt-in batch result. ID arrays use lowercase UUIDs in deduplicated request order. */
export interface BatchUserEnvelope {
  data: BatchUserResponse;
  foundIds: string[];
  missingIds: string[];
}

export interface BatchUserOptions {
  format?: 'map' | 'envelope';
}
