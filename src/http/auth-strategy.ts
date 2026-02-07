/**
 * Authentication strategies for the Registry SDK
 *
 * Re-exports from @uluops/sdk-core.
 */

export {
  ApiKeyAuth,
  JwtSessionAuth,
  createAuthStrategy,
  type AuthStrategy,
  type AuthConfig,
} from '@uluops/sdk-core/http';
