# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.18.0] - 2026-05-09

### Added
- Export `Provenance`, `AuthorshipType`, `ContributorRole`, `ActorType`, `Contributor` types from main entry — consumers can now construct provenance objects for create/update without `as any`
- Export `DefinitionListResponse`, `ForkListResponse`, `ModelsListResponse`, `ProvidersListResponse`, `AliasesListResponse` operation response types from main entry
- Export all 11 error type guards (`isUnauthorizedError`, `isForbiddenError`, `isPayloadTooLargeError`, `isServiceUnavailableError`, `isNetworkError`, `isTimeoutError`) — previously only 5 of 11 were exported
- Export Zod response validation schemas from `@uluops/registry-sdk/types` subpath (41 schemas in `response-schemas.ts`)
- `ForkDefinitionBody.targetOrgSlug` — optional field for cross-org forking (matches API schema)
- Input validation on `models.get()` — rejects empty provider/modelId
- Input validation on `models.resolveAlias()` — rejects empty alias
- Input validation on `analytics.compare()` — validates each version string format
- Input validation on `analytics.getEffectiveness()` and `analytics.getHealth()` — validates optional version param
- Input validation on `versions.list()` — validates pagination params (limit/offset)
- `prepublishOnly` script validates `SDK_VERSION` matches `package.json` version

### Fixed
- `SDK_VERSION` constant updated from 0.16.1 to 0.18.0 (was 2 versions behind `package.json`)
- Fork test and README corrected: `newName` → `name` to match API schema and TypeScript type
- `forkResponseSchema` refactored to reuse `definitionSchema` instead of inline 30-field duplicate that had drifted (`.nullish()` vs `.nullable().optional()`)

## [0.17.0] - 2026-05-02

### Added
- `render.get()` now accepts `"latest"` as a version — resolves to the latest published version server-side
- `buildDefinitionPath()` gains `{ allowLatest: true }` option for read operations that support version aliases

### Changed
- `validateVersion()` error message clarified: `Must be semver format (X.Y.Z)` (unchanged behavior — strict semver only; "latest" is handled at the path-building layer, not validation)

## [0.16.1] - 2026-05-01

### Fixed
- Widen `Model`, `ModelCapabilities`, `DependencyGraph`, `ForkLineage`, and `ForkListResponse` schemas and TypeScript interfaces to match actual API responses — upstream-synced models omit `displayName`, `description`, `providerModelId`, `createdAt`, `updatedAt`, and some capability flags; dependency/fork endpoints return sparse objects for definitions without relationships
- Analytics `definitionRef.version` made optional — cross-version analytics endpoints (evolution, translation, compare) don't always include a version field

## [0.16.0] - 2026-05-01

### Added
- **Zod response validation on all 39 HTTP operations** (up from 8) — every API response is now runtime-validated against a Zod schema before reaching consumer code. Coverage: 8/40 (20%) → 39/40 (98%). Only `definitions.delete` (204 void) is intentionally unvalidated.
- `src/types/response-schemas.ts` — 41 Zod schemas covering definitions, versions, models, forks, dependencies, users, validation, render, translation, analytics, and version diffs
- `DateTimeStringSchema` / `NullableDateTimeSchema` shared datetime primitives (ISO 8601 + bare date format)
- Conditional schema selection for `versions.diff()` — selects the correct schema from 5 shapes based on `full` and `format` parameters
- Recursive `lineageNodeSchema` via `z.lazy()` with explicit `z.ZodType<LineageNode>` annotation
- `createApiResponseSchema()` and `createListResponseSchema()` factory functions for test infrastructure
- Contract test helpers (`test/contract-helpers.ts`): 10 mock data factories with `STRICT_CONTRACTS` safeParse guard, `mockValidatedEndpoint()` / `mockValidatedListEndpoint()` nock helpers
- Response schema unit tests (`test/response-schemas.test.ts`): 30 positive/negative schema validation tests
- 8 `ResponseValidationError` integration tests verifying schema wiring catches malformed API responses

### Changed
- Existing test mock data updated to match Zod schema contracts — 33 mock fixtures corrected (field names, shapes, required fields)

### Removed
- Dead `src/utils/` module (3 files) — re-exported from `@uluops/sdk-core` with zero internal references

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
