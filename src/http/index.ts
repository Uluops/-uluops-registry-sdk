/**
 * HTTP layer exports for the Registry SDK
 */

export { RegistryHttpClient, type HttpClientConfig } from './http-client.js';

export {
  ApiKeyAuth,
  JwtSessionAuth,
  createAuthStrategy,
  type AuthStrategy,
  type AuthConfig,
} from './auth-strategy.js';

export type { FetchClient } from './fetch-adapter.js';
