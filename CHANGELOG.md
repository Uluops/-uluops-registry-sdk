# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.11.2] - 2026-04-09

### Fixed
- `definitionSchema.yaml` field changed from required (`z.string()`) to optional (`z.string().nullish()`) — the API omits `yaml` from responses unless `include_yaml: true`, causing Zod validation failures on every SDK call after Zod 3.25.x upgrade
- Updated `Definition` interface to match: `yaml?: string | null`

## [0.1.0] - 2026-02-05

### Added
- `RegistryClient` with full CRUD operations for definitions, versions, validation, dependencies, forks, executions, translation, models, users, and render
- `RegistryHttpClient` with native fetch, retry logic with exponential backoff and jitter, and timeout handling via AbortController
- Authentication support for API key (`ulr_` prefix) and JWT session tokens with format validation
- Comprehensive error hierarchy: `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `PayloadTooLargeError`, `UnprocessableError`, `RateLimitError`, `ServiceUnavailableError`, `NetworkError`, `TimeoutError`
- Rate limit info exposure via `getRateLimitInfo()` (returns defensive copy)
- Configuration loading from environment variables and `.uluops/credentials.json` with multi-profile support
- Zod runtime response validation wired into definition and execution operations
- Optional Zod schema parameter on `request()` and `requestRaw()` for consumer-side validation
- Response envelope validation — `doFetch()` verifies `{ data: ... }` wrapper from API
- Subpath exports: `@uluops/registry-sdk/types`, `/errors`, `/config`
- TypeScript strict mode with full type declarations
- `isAuthenticated()` and `getAuthType()` convenience methods on `RegistryClient`
- Client-side input validation: definition type, name, version, UUID, pagination, YAML size
- NODE_ENV-based URL resolution (production default, localhost in development)
- Dynamic `SDK_VERSION` read from `package.json` at runtime
- ESLint with typescript-eslint configuration
- 375 tests across 9 test suites covering errors, HTTP client, validators, operations, loaders, helpers, auth strategies, and logger

### Fixed
- Handle 204 No Content responses in `doFetch()` (prevents `response.json()` crash on DELETE)
- URL-encode path segments in model operations (provider, modelId, alias)
- Execution types aligned with OpenAPI spec (`totalCount`, `recentCount`, `windowMinutes`)
- Definition create/update operations now validate YAML size before sending
- `validateCredentials()` throws `ValidationError` (extends `RegistryApiError`) instead of plain `Error`
- Credential loading warns on corrupt `credentials.json` regardless of debug mode

### Changed
- Only GET requests retry by default; mutations require explicit `retryMutations: true` opt-in
- `deepClone` uses native `structuredClone` instead of custom recursive implementation
- Validators throw `ValidationError` with structured details (`field`, `value`, constraints)
- Production URL: `registry.uluops.ai` (was `registry.uluops.dev`)

### Security
- Strip server-internal keys (`stack`, `sql`, `trace`, `hostname`, etc.) from error details
- `Accept` and `X-Content-Type-Options: nosniff` headers on all HTTP requests
- Sensitive field sanitization in debug logger output
- Stricter API key validation (minimum length, character pattern)
