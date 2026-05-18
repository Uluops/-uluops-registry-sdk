# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.21.3] - 2026-05-18

### Added
- `getGlobalConfigDir`, `getCredentialsPath`, `loadStoredCredentials`, `loadEnvFiles` now exported from `/config` sub-path — previously documented in README but missing from the barrel
- `rimraf dist` clean step before `tsc` in build script — prevents stale `.d.ts` artifacts from surviving deleted source files

### Fixed
- README translation.getVersion() example used `version.version` instead of `version.translatorVersion`

## [0.21.2] - 2026-05-18

### Added
- Invalid-case tests for `validateShortString` on render target/model params (invalid chars, >100 chars)
- `resetIdCounter()` export from `test/contract-helpers.ts` for deterministic test IDs
- JSDoc on all config barrel re-exports (`HTTP_STATUS`, `ERROR_CODES`, `ENV_VARS`, etc.)
- Expanded Constants section in README listing all `/config` exports with usage examples

### Fixed
- `BatchUserResponse` index signature now includes `| undefined` for consumer safety with `noUncheckedIndexedAccess`
- `FetchClient` removed from http barrel — internal type, not consumer-facing
- Removed brittle `toHaveBeenCalledTimes(1)` assertions in `loaders.test.ts` delegation tests
- Auth strategy test updated to import `FetchClient` from `@uluops/sdk-core/http` (stale `fetch-adapter.ts` import)
- CHANGELOG `Migration` section merged into `Changed` bullets (keep-a-changelog compliance)
- Mixed-case org name in repository URL lowercased

## [0.21.1] - 2026-05-18

### Fixed
- **BREAKING:** `ForkListResponse` type and Zod schema corrected to match actual API shape — `{ forks: ForkEntry[], totalForks: number }` replaces the incorrect `{ items?, forks?, total? }` triple-optional shape
- `process.env.NODE_ENV` at module scope now guarded with `typeof process !== 'undefined'` — prevents `ReferenceError` in browser environments without bundler process shim

### Added
- `ForkEntry`, `ForkRecord`, `ForkDefinitionSummary` types exported for consumers who destructure fork list responses

## [0.21.0] - 2026-05-18

### Changed
- **BREAKING:** `client.forks.checkForkable()` renamed to `client.forks.isForkable()` — aligns with verb+adjective pattern for boolean-returning methods. Migration: `checkForkable(...)` → `isForkable(...)`
- **BREAKING:** `client.translation.upgrade()` renamed to `client.translation.upgradeDefinition()` — aligns with verb+noun convention used across the SDK. Migration: `upgrade(...)` → `upgradeDefinition(...)`

## [0.20.4] - 2026-05-18

### Removed
- Dead mock factories from `test/setup.ts` — tests now use schema-validated factories from `contract-helpers.ts`
- `DefinitionVersion` type from public exports — never returned by any SDK operation
- Backoff constants (`BACKOFF_BASE_MS`, `MAX_BACKOFF_MS`, `JITTER_MIN`, `JITTER_MAX`) from re-exports — unreachable dead-end, not consumed internally
- `DEFAULT_PROD_URL` / `DEFAULT_DEV_URL` from config barrel — internal-only, consumers should use `DEFAULT_BASE_URL`
- `src/http/fetch-adapter.ts` — single-line type re-export indirection replaced by direct import
- Stale `src/cli.ts` coverage exclude from `vitest.config.ts`

### Fixed
- `retranslate` test used phantom `force` option not in `RetranslateOptions` type — corrected to `createNewVersion`

## [0.20.3] - 2026-05-18

### Added
- `ResponseValidationError` and `isResponseValidationError` re-exported from `@uluops/registry-sdk/errors` — consumers can now catch schema-drift errors without importing `@uluops/sdk-core` directly
- `stars` namespace added to `operations/index.ts` barrel export
- `login()` JSDoc expanded with `@returns`, `@throws` for API-key guard and invalid credentials
- `logout()` JSDoc documenting local-only semantics and silent no-op behavior
- Inline JSDoc on all `EffectivenessMetrics` fields (issueYield, falsePositiveRate, epistemicDensity, etc.)
- Inline JSDoc on all `HttpClientConfig` fields (timeout, retries, debug, onTokenRefresh, sessionToken)
- Constants section in README documenting `MAX_YAML_SIZE` and `SDK_VERSION` exports from `/config` sub-path
- Client-side `validateDefinitionType()` guard on `definitions.list()` — invalid `type` query param now produces actionable error instead of opaque server rejection

### Fixed
- `ResponseValidationError` README error table referenced wrong import path (`@uluops/sdk-core/errors` → `@uluops/registry-sdk/errors`)
- `login()` on API-key-authenticated client now throws immediately instead of firing a live HTTP request
- `SPEC-zod-validation.md` marked as completed (v0.16.0) — was presenting 98%-complete work as a future plan

## [0.20.2] - 2026-05-18

### Added
- `LoginResult` exported type — `login()` return type is now a named interface instead of anonymous inline object
- `GetDefinitionOptions` documented in README with `includeYaml`, `includeRuntime`, `includeRefs` flags
- `client.getHttpClient()` documented in README Advanced Usage section
- Unstar with version test coverage

### Fixed
- `onTokenRefresh` callback now forwarded to JwtSessionAuth after `login()` — previously lost
- `prepublishOnly` script uses ESM-safe `fs.readFileSync` + `JSON.parse` instead of CJS `require()`
- CHANGELOG version gap (0.12-0.15) explained with stub entry
- SAFETY comment on Zod `z.record` key narrowing transform in `ecosystemOverviewSchema`

## [0.20.1] - 2026-05-18

### Added
- Function overloads on `versions.diff()` — callers now get narrowed return types (`VersionDiff`, `VersionFieldDiff`, `VersionUnifiedDiff`, or `VersionDiffSummary`) based on options passed
- `retryMutations: true` on `executions.record()` and `stars.star()` — idempotent POST operations now retry on transient 502/503 errors
- `validateShortString()` input validation on `target` and `model` parameters in render operations
- `npm audit --audit-level=high --omit=dev` gate in `prepublishOnly` script
- 5 analytics validation rejection tests (getEffectiveness, getHealth, compare, getDiffImpact)

### Fixed
- Login temp client now forwards user-configured timeout instead of using default
- Replaced unnecessary dynamic import in `login()` with existing static import
- YAML boundary test used wrong value (102400 → MAX_YAML_SIZE)
- `files` field now includes README.md and CHANGELOG.md in published tarball
- `archived` status value added to README definitions.list() param table
- `ValidationFieldError` type added to README TypeScript Support section
- npm audit fix: resolved all devDependency CVEs (flatted, minimatch, picomatch, rollup, vite)

## [0.20.0] - 2026-05-18

### Added
- `client.stars` namespace — star/unstar definitions and check star status (`getStatus`, `star`, `unstar`). Per-user per-definition, all idempotent. Matches existing Registry API star endpoints.
- `StarResult` type and `starResultSchema` Zod validation schema
- `ValidationFieldError` type exported from main entry — renamed from `ValidationError` response interface to avoid collision with the SDK's `ValidationError` error class

### Changed
- `SDK_VERSION` updated to 0.20.0

## [0.19.0] - 2026-05-15

### Changed
- **BREAKING:** `client.forks.getLineage()` renamed to `client.forks.getAncestry()` — resolves naming collision where `forks.getLineage()` (flat fork ancestry chain) and `analytics.getLineage()` (recursive version tree with metrics) shared a method name for fundamentally different operations. Identified by name-game pipeline with 4/4 cognitive lens convergence.
- `SDK_VERSION` updated to 0.19.0

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

## [0.12.0] through [0.15.x]

These versions were published before the changelog was established. Changes included SDK-core extraction, auth strategy refactoring, analytics operations, and response schema validation. See git history for details.

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
