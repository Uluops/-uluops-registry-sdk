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
  [userId: string]: PublicUser | null;
}
