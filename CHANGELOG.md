# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.40.0] - 2026-07-07

### Added

- **Provenance-aware quality analytics types** (registry-api >= 0.52, spec Phase 2). New
  `QualityProvenance` / `QualitySegment` types and schemas let the additive `provenance`
  block THROUGH the default `.strip()` (older SDKs silently drop it):
  - `metrics.provenance` on effectiveness: `{ actorCount, voterCount, confidence,
    minActorRuns, independent?, selfReported? }` — `independent` is the headline figure
    wherever one number is shown
  - optional name-scoped `provenance` on evolution / translation / compare / diff-impact
    (values on those surfaces stay runs-weighted by design)
  - `compositionLift.confidence` label; `confidence` + `weightsProvisional` on ecosystem
    ranked rows (ranked lanes only admit established-confidence definitions)

### Changed

- Doc-level semantics: effectiveness `passRate` / `runAvgScore` are VOTER-WEIGHTED
  (one actor, one vote) from registry-api >= 0.52; `scoreStdDev` is the std dev over
  voter means (null below 2 scored voters); `uniqueUsers` documented as the all-time
  distinct-actor count. Types/fields unchanged — weighting happens server-side.

## [0.39.0] - 2026-07-06

Ships as MINOR per the pre-1.0 versioning policy — purely additive.

### Changed

- **Bumped `@uluops/sdk-core` pin `0.14.0` → `0.15.0`.** sdk-core 0.15.0 adds the
  streaming transport (`requestStream`/`getStream`). Because `RegistryHttpClient
  extends HttpClient` and is a public export, these methods are now **inherited on
  `RegistryHttpClient`** for advanced consumers holding the low-level client — a
  resilient way to obtain an unconsumed `Response` for stream passthrough (auth,
  redirect rejection, error mapping, and security-event emission through the
  headers; no retry after handoff). See the sdk-core README for the contract.
- **`engines.node` raised `>=18.0.0` → `>=20.3.0`** to match sdk-core's real
  runtime floor: the inherited `getStream` composes the caller's `AbortSignal` via
  `AbortSignal.any` (Node 20.3.0+). Buffered operations are unaffected.

## [0.38.0] - 2026-07-02

Ships as MINOR per the pre-1.0 versioning policy — purely additive. Adopts
`@uluops/sdk-core@0.14.0` (security-observability release) and surfaces its new
public API.

### Added

- **Structured security-event channel.** `onSecurityEvent` is now a typed option
  on both `RegistryClientConfig` (high-level `RegistryClient`) and `HttpClientConfig`
  (low-level `RegistryHttpClient`), threaded to the underlying sdk-core client —
  including the temporary client used for the `login()` POST, so a redirect on the
  credential-carrying login is observable. The `SecurityEvent` union and its
  member types (`SecurityEventHandler`, `SecurityEventType`, `AuthType`,
  `AuthFailureEvent`, `RedirectRejectedEvent`, `TokenRefreshFailedEvent`,
  `AuthStrategyReplacedEvent`) are re-exported for typing handlers.
- **`RedirectError` + `isRedirectError`** re-exported from `@uluops/registry-sdk/errors`.
  An upstream 3xx now throws this dedicated, non-retryable error.

### Changed

- **Bump `@uluops/sdk-core` 0.13.0 → 0.14.0.** Pulls in redirect hardening
  (`redirect: 'manual'`, no credential body replay — relevant here because the
  registry SDK runs a separate `authBaseUrl`; an auth-endpoint redirect is now
  reported against `authBaseUrl`), `baseUrl` embedded-credential rejection
  (CWE-200), sanitized `requestId`, and logger routing. **Migration:** catch
  `RedirectError` (or `isRedirectError(e)`) where you previously caught
  `NetworkError` for a redirect; redirects are no longer auto-retried.

## [0.37.0] - 2026-06-28

Ships as MINOR per the pre-1.0 versioning policy. Purely additive — one new
field on the definition shapes and one new sort option; existing consumers are
unaffected.

### Added

- **`uniqueExecutionCount`** on `Definition` and `DefinitionListItem` (and their
  Zod schemas `definitionSchema` / `definitionListItemSchema`). The registry now
  exposes **two** execution counts: `executionCount` is the total number of runs
  (all-time, name-scoped across versions) and `uniqueExecutionCount` is the number
  of **distinct actors** who ran the definition (all-time, name-scoped) — a
  gaming-resistant signal (one actor's repeated runs collapse to 1) that drives
  discovery ranking. The total/unique ratio is a usage-quality tell. Requires
  registry API `V1_API_VERSION` ≥ `2026-06-28`; older API responses simply omit
  the field.
- **`'uniqueExecutionCount'`** added to `SORT_FIELDS` / the `SortField` type, so
  `client.definitions.list({ ... }, { sortBy: 'uniqueExecutionCount' })` ranks by
  distinct users. (The registry's "popular" discovery rail now sorts on this.)

## [0.36.0] - 2026-06-16

Ships as MINOR per the pre-1.0 versioning policy. Additive — one new optional
parameter, one new exported type, plus a security hardening of `getLineage` that
is transparent to all legitimate responses.

### Security

- **`analytics.getLineage()` now guards against a malicious/MITM'd recursive response (CWE-674).** `lineageResultSchema.root` is a `z.lazy()` tree whose `versions[]`/`forks[]` arrays recurse; a pathological payload nested thousands of levels deep would exhaust the V8 call stack during the recursive Zod parse (empirically ~2,200 levels on a main-thread stack, ~1,100 on a worker thread) and crash the process. An iterative pre-parse walk (explicit stack — cannot itself overflow) now rejects any response exceeding a depth ceiling of **50** or **100,000** total nodes with a `RangeError` before the recursive parse runs. The legitimate endpoint returns a flat depth-2 tree (forks capped server-side at 100/definition, fork-chains at depth 10), so this is invisible to real traffic. Mirrors the existing `MAX_SAFE_GRAPH_DEPTH` guard in the dependency-graph parser.
- **Bumped `tsx` devDependency `4.19.2` → `4.22.4`**, which pulls `esbuild` `0.28.1` and clears advisory GHSA-67mh-4wv8-2f99 (and the sibling GHSA-gv7w-rqvm-qjhr). Dev-only and not shipped to consumers (`files` is `dist`/`README`/`CHANGELOG`), so this has no runtime effect.

### Added

- **`GetLineageOptions`** (exported from the package root) with an optional **`maxDepth`** field, accepted as a third argument by `client.analytics.getLineage(type, name, options)`. Lets callers tighten the depth ceiling below the hard safety cap as defense-in-depth; values above 50 clamp to 50. Defaults to the hard ceiling when omitted, so existing calls are unaffected.

### Removed

- **Dead `ModelSyncResult` interface** (`src/types/models.ts`). It was never exported from the package root and had no consumer or producing operation — a hand-written duplicate of the contract-tested `modelSyncResultSchema` (which is retained). Non-breaking: nothing public referenced it.

### Docs

- Added `@throws {ValidationError}` JSDoc to `users.batch` (>100 IDs / invalid UUID) and `analytics.compare` (version count / invalid semver).
- Added `DefinitionRef` to the README "Types only" import example with a one-line description.

### Tests

- Added three `getLineage` depth-guard tests: rejects an over-deep tree with `RangeError`, honors a caller-supplied lower `maxDepth`, and accepts a legitimate flat tree under a tightened ceiling.

## [0.35.0] - 2026-06-16

Ships as MINOR per the pre-1.0 versioning policy (dependency bump pulling in
behavioral fixes).

### Changed

- **Bumped `@uluops/sdk-core` to `0.13.0`** (exact pin), which carries three fixes that affect this SDK at runtime:
  - `retries: 0` now makes one attempt and surfaces the real typed error (e.g. `NetworkError`) instead of a contextless `Error('Request failed')`.
  - A 401 with credentials present now yields an actionable `UnauthorizedError` (server reason preserved, plus guidance that the credential may be expired/revoked/invalid), distinct from the no-credentials case; the broken private-monorepo link was removed from the no-credentials message.
  - `isApiKey()` now enforces the minimum key length, so it agrees with the `ApiKeyAuth` constructor.

## [0.34.0] - 2026-06-16

Ships as MINOR per the pre-1.0 versioning policy. Mostly additive; one contained
behavioral change to response-validation error typing (see **Changed**).

### Added

- **`ResponseValidationError`** (exported from `@uluops/registry-sdk/errors`). Thrown when a Registry API response fails the SDK's Zod schema (contract drift, malformed bodies). It extends `RegistryApiError`, so it is caught by `isRegistryApiError()` and any `catch (e) { if (e instanceof RegistryApiError) }` block. The original `ZodError` is preserved on `.zodError`; `code` is `RESPONSE_VALIDATION`, `statusCode` is `0`, and it is non-retryable. This makes the previously-documented-but-nonexistent error-table entry real (AF-003).
- **Safety-analysis types now exported from the package root**: `RiskProfile`, `RiskLevel`, `SignalSeverity`, `SafetySignal`, `SyncScanResult`, `DeepAnalysisResult`, `DeepFinding`, `DefinitionCapabilities` — previously reachable only via the `/types` subpath even though `Definition.riskProfile` is a root-level surface. `DefinitionRef` is now exported from the root too.
- **`RetranslateResult`** is now re-exported from the package root (the only operation return type that was previously inaccessible for explicit annotation).

### Changed

- **Response-schema validation failures now throw `ResponseValidationError` instead of a raw `ZodError`.** All 33 response parses across the operation layer route through an internal `parseResponse()` helper. Validation failures stay inside the documented error hierarchy and are caught by `isRegistryApiError()`. **Migration:** consumers that explicitly caught `ZodError` from SDK calls should catch `ResponseValidationError` (or use `isRegistryApiError`); the underlying `ZodError` remains available on `err.zodError`. The `isRegistryApiError()` path now *also* catches these failures (it did not before) — a strict improvement for the documented catch pattern.

### Docs

- Fixed the `publish()` example to use `result.definition.status` and surface `warnings`, matching the `PublishResult` shape introduced in 0.29.0.
- Documented `executions.record()` in the API reference (body fields + example).
- Added a **Safety Analysis** section documenting `Definition.riskProfile` (`sync` / `deep` / `aggregateRiskLevel`).
- Corrected the `ResponseValidationError` error-table row (statusCode `0`, `.zodError`).
- Added `@returns` / `@throws` JSDoc to `parseDefinitionRef` and `buildDefinitionPath`.

### Tests

- Response-validation tests now assert `ResponseValidationError`; added a test verifying the thrown error is a `RegistryApiError` and wraps the original `ZodError`. Suite 462 → 467.

## [0.33.0] - 2026-06-16

Additive, non-breaking. Ships as MINOR per the pre-1.0 versioning policy.

### Added

- **Fork source-identity snapshot on `Fork`** (`sourceType` / `sourceName` / `sourceVersion`) and **`sourceAvailable`** on `ForkLineage`. Surfaces the durable provenance the registry added in V1 `2026-06-16`: a fork's origin is now readable through `forks.getAncestry` / `forks.list` / `forks.create` even after the source is deleted (live `source` becomes `null`, but `fork.source*` survives). All declared with `.nullish()` so the SDK keeps parsing fork responses from APIs older than `2026-06-16` (the keys are simply absent there) — bare `.nullable()` would have thrown on the absent key. Requires registry API ≥ V1 `2026-06-16` to be populated.

## [0.32.0] - 2026-06-13

Additive, non-breaking. Ships as MINOR per the pre-1.0 versioning policy (a new
optional field on an existing type).

### Added

- **`limits` on the `Model` type** (`ModelLimits = { context: number; output: number }`, also exported). `context` is the model's maximum context window in tokens; `output` is its max output tokens. The registry API already returned this object on `GET /models/:provider/:modelId`, `GET /models/resolve/:alias`, and (as of the paired API release) `GET /models` — but the SDK's `modelSchema` did not declare it, so Zod **silently stripped it** before consumers ever saw it. `limits` is now declared on `modelSchema` and survives validation on every model-returning path (`list`, `get`, `resolveAlias`). The field is optional: the list endpoint historically omitted it, and upstream-synced rows with a null/0 limit surface as absent or `{ context: 0, output: 0 }` — consumers should treat a `0`/missing window as "unknown."

### Tests

- 2 new `modelSchema` tests: `limits.context` is preserved through validation, and a model with no `limits` still parses (optional). Suite 460 → 462.

## [0.31.1] - 2026-06-08

Post-implementation hardening on the 0.31.0 envelope rewrite. No breaking
changes; all improvements are defensive, type-precision, or doc-fix.

### Security

- **Pre-parse depth guard on the dependency graph** (CWE-674). `dependencies.get()` now checks the envelope's `maxDepth` field BEFORE the recursive Zod parse runs, throwing `RangeError` when it exceeds `MAX_SAFE_GRAPH_DEPTH` (50, ~7× the live-verified production max of 7). A malicious or pathological server returning a 10,000-deep graph would otherwise exhaust the V8 call stack via the recursive `z.lazy()` walk. The guard reads a shallow primitive so the check completes before any tree allocation.
- **Defensive string-length ceilings** (CWE-20). `name` (100), `version` (20), `context` (255) on `dependencyNodeSchema`, `flatDepSchema`, and `dependentSchema` now have `.max()` bounds aligned with server-side DB column sizes. Oversized payloads convert from silent memory pressure into a loud ZodError at parse time.

### Changed

- Extracted a shared `dependencyEnvelopeDefinitionSchema` for the `{type, name, version}` envelope header used by both `dependencyGraphResponseSchema` and `dependentsResponseSchema` — was duplicated inline at two sites. NOT to be confused with the looser `definitionRefSchema` used by analytics endpoints (which has optional version and `z.string()` for type).
- `DependencyNodeShape` now references `DefinitionType` directly instead of `z.infer<typeof definitionTypeResponseSchema>` (clarity; types are identical).

### Docs

- README `dependencies.get()` example rewritten to the post-R12 envelope shape (was still showing the removed `.nodes` / `.edges` / `.cycleDetected` fields — which would break for any consumer copy-pasting). `getDependents()` example added showing `Dependent.context` iteration. BREAKING change callout added in the Dependencies section. Pre-1.0 versioning policy note added to the API Compatibility section explaining why a typed breaking change can ship as MINOR pre-1.0.

### Tests

- 3 new tests: depth-2 tree (exercises the `z.lazy` recursion beyond depth 1 — prior tests only ran at depth 1, so a mutation replacing the recursive schema with a depth-1-only shape would have passed everything), CWE-20 oversized-string rejection, and CWE-674 depth-guard `RangeError`. Suite 457 → 460.

## [0.31.0] - 2026-06-08

### Changed

- **BREAKING (small surface): `dependencies.get()` and `dependencies.getDependents()` now return real envelopes.** Live-tests T2 §3.5 (R12). Both methods used to parse responses through a single `dependencyGraphSchema` with optional `nodes / edges / cycleDetected / cycles` fields that bore no relation to the API response — every field was optional, so any response (including the actual `{ data: { definition, graph, flat, totalCount, maxDepth } }` shape) parsed as `{}`. Callers received a degenerate object the type system happily accepted, then defended against it with runtime `data.nodes ?? data.flat ?? []` fallbacks.

  After R12:
  - `dependencies.get()` returns `DependencyGraphResponse = { definition, graph: DependencyNode (recursive), flat: FlatDep[], totalCount, maxDepth }`. The graph is a true recursive tree (`DependencyNode.dependencies: DependencyNode[]`) with optional `context` per node (`"invokes.agent"`, `"phase validate"`, etc).
  - `dependencies.getDependents()` returns `DependentsResponse = { definition, dependents: Dependent[], totalCount }`. Each `Dependent` carries `{ id, type, name, version, context }`.

  TS consumers typed against the old `DependencyGraph` shape will see compile errors at `.nodes`, `.edges`, `.cycleDetected`, `.cycles` — there are no migration shims because, in practice, those fields never carried data; the migration is to read the real fields (`graph` / `flat` / `dependents`) instead.

### Added

- New exported types: `DependencyNode` (recursive), `FlatDep`, `Dependent`, `DependentsResponse`, `DependencyGraphResponse`.
- New exported Zod schemas: `dependencyNodeSchema` (recursive via `z.lazy`), `flatDepSchema`, `dependentSchema`, `dependentsResponseSchema`, `dependencyGraphResponseSchema`.

### Removed

- `DependencyGraph` (interface) and `DependencyEdge` (interface) — these typed something the API never returned.
- `dependencyGraphSchema` (Zod) and `dependencyEdgeSchema` (Zod) — same reason.

### Internal

- 7 new schema tests covering recursive graphs, the no-deps and no-dependents envelopes, the pre-R12 bare-`{}` degenerate shape rejection, and `flatDep` depth bounds. 2 new operations tests round-trip the full envelope via `nock`. Suite 448 → 455.

## [0.30.2] - 2026-06-01

### Security

- **Bump `@uluops/sdk-core` from `0.11.0` to `0.11.1`.** Pulls in today's security hardening: `redirect: 'error'` on all fetch sites (CRLF/credential-replay on auth redirects), control-character stripping in error messages (`stripControlChars` + `SdkApiError` constructor), widened `SENSITIVE_KEYS` (x-api-key, set-cookie, proxy-authorization, x-auth-token), added `column` to `REDACTED_DETAIL_KEYS`, and `sanitizeString` coverage for URL userinfo + bare JWT shapes.

### Supply chain

- **Pin all dependencies and devDependencies to exact versions.** Per the new UluOps-wide exact-pinning policy adopted 2026-06-01 in response to the RedHat-class supply-chain attack pattern. Lockfile re-aligned.

## [0.30.1] - 2026-06-01

### Fixed

- **`translation.retranslate()` now returns a narrow retranslation summary instead of trying
  to parse the response as a full `Definition`.** The API endpoint `POST /definitions/:type/:name/retranslate`
  returns `{type, name, version, translatorVersion, previousTranslatorVersion, changes}` —
  not a complete Definition object. Previously every retranslate call threw
  `ZodError: expected string, received undefined` on the missing id/status/hash/displayName/...
  fields.

  Added `retranslateResultSchema` + `RetranslateResult` type. Public return type changed
  from `Definition` to `RetranslateResult` (typed breaking change, but the runtime payload
  was always this shape — callers who used `result.id` etc. were already crashing).

  Surfaced by live MCP smoke test (`retranslate_definition` via uluops-registry).

## [0.30.0] - 2026-06-01

### Breaking

- **Requires `@uluops/sdk-core` 0.11.0.** sdk-core 0.11.0 removed the `options.schema`
  parameter from HTTP methods. registry-sdk now compatible only with 0.11.x.
- **Removed re-export of `ResponseValidationError` and `isResponseValidationError`.**
  Both were removed from sdk-core in 0.11.0. Consumer code that caught
  `ResponseValidationError` should now catch `ZodError` from `zod`.
- **No public API changes** — every exported operation still returns the same validated
  type. Schema validation moved from inside `http.METHOD(..., { schema })` to an external
  `Schema.parse(await http.METHOD(...))` wrap. Behavior identical except for the error class.

### Internal

- 42 call sites across 17 operation files migrated to the external-parse pattern.
- One file (`versions.ts`) had object-shorthand `{ schema }` (variable assignment) and was
  migrated by hand; the rest went through `scripts/migrate-schema.mjs`.
- Response-validation assertions in `analytics.test.ts` and `operations.test.ts` switched
  from `/API response validation failed/` regex match to `ZodError` class match.

## [0.29.0] - 2026-05-28

### Breaking

- **`publish()` returns `PublishResult`** — previously returned `Definition` directly. The new return type is `{ definition: Definition; warnings: PublishWarning[] }`.
  - Migration: replace `const def = await client.definitions.publish(...)` with `const { definition: def } = await client.definitions.publish(...)`.
  - Rationale: the registry API (v0.49.3) now returns non-fatal publish warnings (translation failure, safety-scan failure, etc.) on the response. Without surfacing them through the SDK, a definition could publish "successfully" but be unrenderable with no signal to the caller — exactly the gap the API change was made to close.

### Added

- **`PublishWarning` type** — `{ code, message, details? }`. Known codes: `TRANSLATION_FAILED`, `TRANSLATION_ERROR`, `SAFETY_SCAN_FAILED`, `SAFETY_PROFILE_PERSIST_FAILED`, `DEEP_ANALYSIS_ENQUEUE_FAILED`. More codes may be added without bumping major.
- **`PublishResult` type** — exported. `warnings` is always present, possibly empty.
- **`publishWarningSchema` and `publishResponseSchema`** — Zod schemas for the new envelope.

### Internal

- `publish()` switches from `http.post` to `http.request('POST', ...)` with `rawEnvelope: true` so it can read the top-level `warnings` field. This is the only endpoint with non-`data` response fields; all other operations continue using the default envelope-unwrapping path.

## [0.28.0] - 2026-05-28

### Breaking

- **`Fork` type rewritten** — replaced the aspirational `{ id, sourceDefinitionId, derivedDefinitionId, sourceVersion, createdAt }` shape with the real DB record shape: `{ id, definitionId, sourceDefinitionId, forkedAt }`. `sourceDefinitionId` is now nullable to reflect `SET NULL` on source deletion. Consumers reading `.derivedDefinitionId` / `.sourceVersion` / `.createdAt` must migrate.
- **`ForkLineage` type rewritten** — replaced the unused `{ current, source, chain }` structure with the actual lineage endpoint shape: `{ isFork, fork, source }`.
- **`ForkResponse.source` narrowed** — was typed as the full `DefinitionListItem` (~20 fields), now correctly typed as `ForkSummary` (6 fields) to match the API.
- **`ForkRecord` and `ForkDefinitionSummary` types removed** — replaced by the unified `Fork` and `ForkSummary` types.

### Fixed

- **Fork response schemas aligned with API contract** — the SDK's Zod schemas for `fork_definition`, `get_fork_lineage`, and `list_forks` previously expected fields the API never returns, causing `ResponseValidationError` on every fork-related call. Schemas now match the actual API shape.

### Added

- **`ForkSummary` type exported** — slim 6-field summary (`id, type, name, version, authorId, orgId`) used by fork endpoints. Consolidates the previously-duplicated `ForkDefinitionSummary`.
- **`InheritedBaseline` type added to `DefinitionHealth`** — surfaces the source's health score and grade at fork time as a transparent baseline (`status: 'active' | 'superseded'`). Gives consumers an initial trust signal for forks that have not yet accumulated their own measurement data.

### Internal

- Removed stale `models.sync()` test that referenced the admin-only endpoint dropped in 0.27.1.

## [0.27.2] - 2026-05-27

### Added

- **`client.languages` namespace** — `list()` returns all 4 definition languages (ADL, CDL, WDL, PDL) with current version info. `get(id)` returns a language with its full JSON Schema content embedded in the response. Read-only — no admin endpoints.

## [0.27.1] - 2026-05-27

### Fixed

- **Auth base URL corrected** — default auth URL changed from `https://api.uluops.ai/api/v1/ops` to `https://api.uluops.ai/api/v1`.

### Removed

- **`models.sync()` removed** — admin-only endpoint no longer exposed through the public SDK. Use the API directly for model catalog sync.
- **`ModelSyncResult` type removed** — no longer exported.

## [0.27.0] - 2026-05-27

### Added

- **`riskProfile` on `Definition` interface** — definitions now include safety scan results when available (`riskLevel`, `signals`, `scannerVersion`, `scannedAt`).

### Fixed

- **`ModelSyncResult.duration` accepts `number`** — was typed as `string` only, now accepts the numeric duration returned by the API.

### Changed

- Removed admin-only execution recording section from public README.

## [0.26.0] - 2026-05-20

### Added
- **`normalize` option on `definitions.get()`** — pass `{ normalize: true }` to receive server-side normalized definitions in the `normalized` field. Transforms computed by the API via `@uluops/definition-factory`.
- **`normalized` field on `Definition`** — `Record<string, unknown> | null` containing the runtime-ready definition shape when normalization is requested
- **`normalizationError` field on `Definition`** — error message when normalization fails (e.g., malformed YAML)

### Removed
- **BREAKING: `@uluops/registry-sdk/normalization` subpath removed** — normalization logic migrated to `@uluops/definition-factory` and exposed server-side via `?normalize=true`. For offline normalization, import `normalizeDefinition` from `@uluops/definition-factory` directly.
- Deleted `src/normalization/` directory (7 files) and `test/normalization.test.ts` (46 tests now live in definition-factory)

### Changed
- ADR-003 updated with migration revision documenting the move to server-side normalization

## [0.25.0] - 2026-05-20

### Added
- **`onRetry` callback** — new client config option fires before each retry attempt with `{ attempt, maxAttempts, error, delayMs }`. Passed through to sdk-core.

### Dependencies
- `@uluops/sdk-core` bumped to `^0.9.0` (onRetry callback)

## [0.24.0] - 2026-05-20

### Added
- **`onRateLimitApproaching` callback** — new client config option fires when rate limit remaining drops below threshold (default: 10%). Enables proactive throttling before hitting 429. Includes `rateLimitThreshold` option to customize the trigger ratio.
- **`RateLimitInfo` type re-exported** from `@uluops/registry-sdk` — consumers no longer need to import from `@uluops/sdk-core` directly
- **CORS documentation expanded** — Browser Usage section now includes proxy patterns (Next.js API routes, Express middleware, reverse proxy) and security guidance for `Access-Control-Allow-Origin`

### Changed
- **`NetworkError` now auto-retried** — transient DNS failures, connection resets, and ECONNREFUSED are retried with exponential backoff alongside 502/503/504/429. README, Features, Error Classes table, and retry documentation updated to reflect this.

### Dependencies
- `@uluops/sdk-core` bumped to `^0.8.0` (NetworkError retryable, rate limit callback)

## [0.23.0] - 2026-05-19

### Changed
- **README restructured for auth safety** — Quick Start now leads with `createClientFromEnvironment()` and environment variables instead of hardcoded API keys. All inline examples updated to use `process.env.ULUOPS_API_KEY` or server-side injection. Browser section warns against bundling keys in client code. Resolves adoption-drift finding that AI assistants would propagate the unsafe auth path.
- **`logout()` deprecated** — renamed to `clearLocalSession()` to accurately convey local-only semantics. The ops-sdk's `logout()` calls `/auth/logout-all` server-side; the registry-sdk's version only clears the in-memory token. `logout()` remains as a deprecated alias for backward compatibility.
- **Idempotent mutations now retried** — `publish()`, `deprecate()`, and `archive()` operations now pass `retryMutations: true`, matching the existing behavior of `executions.record()` and `stars.star()`. Non-idempotent mutations (create, update, delete) remain non-retried. README retry documentation updated to list which operations retry.

### Fixed
- **Token refresh failure message enriched** — when a session token expires and automatic refresh is unavailable (CWE-316 credential clearing), the `UnauthorizedError` message now explains why and tells the user to call `login()` again. Previously only logged at debug level.
- README session auth section now documents that `new RegistryClient()` without credentials is valid for the `login()` flow

### Dependencies
- `@uluops/sdk-core` bumped to `^0.7.0` (enriched auth error messaging)

## [0.22.0] - 2026-05-19

### Added
- **Definition normalization** — new `@uluops/registry-sdk/normalization` subpath export with pure functions that transform CDL/WDL/PDL YAML authoring format into the runtime shape executors expect. Previously, every SDK consumer (MCP server, CLI, core) had to build their own normalization layer. Now canonical and reusable.
  - `normalizeDefinition(parsed)` — orchestrator: detects top-level key, dispatches to type-specific normalizer
  - `normalizeCommandSection(section)` — CDL: `invokes.agent/agents` → `agents[]`, preflight/postflight → `execution.*`, `overrides.threshold` → `execution.thresholds.pass`
  - `normalizeWorkflowSection(section)` — WDL: `steps[].command` → `commands[]`, `condition` → `skip_if` (negated), default `gate.aggregate`
  - `normalizePipelineSection(section)` — PDL: infer `stage.type` from `agents[]` or `ref` presence
  - `validateWorkflowStructure(section)`, `validatePipelineStructure(section)` — structural guards
  - `DefinitionValidationError` — thrown on invalid definition structure
- All normalizers are immutable (return new objects via `structuredClone`) and browser-safe (no Node.js APIs)
- See ADR-003 for design rationale

## [0.21.4] - 2026-05-18

### Fixed
- **Security**: orgSlug now validated at construction time via `validateShortString()` — blocks CRLF header injection (CWE-93), special characters, and overlength values
- Stale "39 operations (98% coverage)" claim in README replaced with accurate description

### Added
- Unit tests for `validateShortString` — boundary at 100/101 chars, empty string, CRLF, special characters, non-string input
- Response-validation-wiring tests for all 7 remaining analytics endpoints (`getHealth`, `getEcosystemOverview`, `getLineage`, `getEvolution`, `getTranslation`, `compare`, `getDiffImpact`)
- JSDoc `@remarks` on `login()` documenting post-login re-authentication requirement for long-running processes

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
