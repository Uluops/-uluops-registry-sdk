# Registry SDK: Zod Response Validation Expansion

> **Status: COMPLETED in v0.16.0** — 39/40 HTTP calls (98%) now have Zod runtime validation. This document is retained as a historical implementation spec.

## Problem

Only 8 of 40 HTTP calls (20%) validate API responses with Zod schemas. The remaining 31 calls use `as T` casts — TypeScript types are enforced at compile-time only, with no runtime guarantee. If the API response drifts from the expected shape, consumers get silent data corruption rather than a clear `ResponseValidationError`.

This was already addressed in the ops-sdk. Same pattern applies here, with the same file organization (`response-schemas.ts`).

## Response Envelope Convention

The sdk-core `HttpClient.parseJsonEnvelope()` automatically unwraps `{ data: T }` envelopes from all API responses. It **hard-throws** `SdkApiError` if the response is not wrapped in `{ data: ... }`.

**Consequence for schemas:** All Zod schemas validate the **inner** `T` object, not the `{ data: T }` wrapper. For example, `definitionEffectivenessSchema` validates `DefinitionEffectiveness` directly — the `data` key is already stripped by the time Zod runs.

**List endpoints** return their arrays under endpoint-specific keys (not a generic `items` key):
- `definitions.list` → `{ definitions: [...], total, limit, offset, hasMore? }`
- `versions.list` → `{ versions: [...], total, limit, offset }`
- `models.list` → `{ models: [...], total, limit, offset }`
- `forks.list` → `{ forks: [...], total, limit, offset }`

Each list schema must use the correct key name.

## Error Handling Contract

When a Zod schema is passed via `{ schema }`, the HttpClient runs `schema.parse(result)` on the unwrapped response. On mismatch:

1. Zod throws `ZodError`
2. HttpClient catches it and re-throws as `ResponseValidationError` (exported from `@uluops/sdk-core/errors`)
3. `ResponseValidationError` contains `.endpoint` (string) and `.issues` (ZodIssue[])

Consumers should catch `ResponseValidationError` separately from `SdkApiError` (network/HTTP errors) to distinguish schema drift from connectivity issues.

**If a schema proves too strict in production** (e.g., rejects a valid API response due to an untyped field), widen the specific field with `.nullable()` or `.optional()` as appropriate. Never remove the schema entirely — that returns to silent `as T` casting. Default `.strip()` means unknown fields don't cause failures, so this should only happen if a field's *type* changes, not if new fields are added.

## Current State

### Validated (8 calls)

| Operation | Schema | Return Type |
|-----------|--------|-------------|
| `definitions.get` | `definitionSchema` | `Definition` |
| `definitions.create` | `definitionSchema` | `Definition` |
| `definitions.update` | `definitionSchema` | `Definition` |
| `definitions.publish` | `definitionSchema` | `Definition` |
| `definitions.deprecate` | `definitionSchema` | `Definition` |
| `definitions.archive` | `definitionSchema` | `Definition` |
| `executions.record` | `recordExecutionResultSchema` | `RecordExecutionResult` |
| `executions.getStats` | `executionStatsSchema` | `ExecutionStats` |

### Intentionally Unvalidated (1 call)

| Operation | Reason |
|-----------|--------|
| `definitions.remove` | Returns `void` (204 No Content) — no body to validate |

### Quick Win (1 call — schema exists but isn't passed)

| Operation | Return Type | Existing Schema |
|-----------|-------------|-----------------|
| `translation.retranslate` | `Definition` | `definitionSchema` (already exists, just not wired) |

### Unvalidated — Needs New Schemas (30 calls)

| File | Operation | Return Type | Complexity |
|------|-----------|-------------|------------|
| **definitions.ts** | `list` | `DefinitionListResponse` | Medium — `{ definitions: DefinitionListItem[], total, limit, offset, hasMore? }` |
| **versions.ts** | `list` | `VersionsListResponse` | Medium — `{ versions: VersionListItem[], total, limit, offset }` |
| **versions.ts** | `diff` | `VersionDiff \| VersionDiffSummary \| VersionFieldDiff \| VersionUnifiedDiff` | High — 5 shapes (see Phase 4) |
| **render.ts** | `get` | `RenderResult` | Low |
| **render.ts** | `preview` | `RenderResult` | Low (same schema) |
| **validation.ts** | `validate` | `ValidationResult` | Low |
| **translation.ts** | `getVersion` | `TranslatorVersion` | Low |
| **translation.ts** | `upgrade` | `UpgradeResult` | Medium — embeds `Definition` + `changes: Record<string, unknown>` |
| **forks.ts** | `create` | `ForkResponse` | Medium — `{ definition: Definition, fork: Fork, source: DefinitionListItem, warnings? }` |
| **forks.ts** | `checkForkable` | `ForkableCheck` | Low |
| **forks.ts** | `getAncestry` | `ForkLineage` | Medium — `{ current: DefinitionListItem, source?: DefinitionListItem \| null, chain: DefinitionListItem[] }` |
| **forks.ts** | `list` | `ForkListResponse` | Medium — contains list items |
| **dependencies.ts** | `get` | `DependencyGraph` | Medium — nodes + edges |
| **dependencies.ts** | `getDependents` | `DependencyGraph` | Medium (same schema) |
| **users.ts** | `get` | `PublicUser` | Low |
| **users.ts** | `batch` | `BatchUserResponse` | Medium — `Record<string, PublicUser \| null>` (type alias, not interface) |
| **models.ts** | `list` | `ModelsListResponse` | Medium — contains `Model[]` |
| **models.ts** | `get` | `Model` | Medium — nested `ModelCapabilities` |
| **models.ts** | `listProviders` | `ProvidersListResponse` | Low |
| **models.ts** | `listAliases` | `AliasesListResponse` | Low |
| **models.ts** | `resolveAlias` | `AliasResolution` | Low — may embed `Model` |
| **models.ts** | `sync` | `ModelSyncResult` | Low |
| **analytics.ts** | `getEffectiveness` | `DefinitionEffectiveness` | High — deeply nested metrics |
| **analytics.ts** | `getHealth` | `DefinitionHealth` | High — nested factors + issue profile |
| **analytics.ts** | `getEcosystemOverview` | `EcosystemOverview` | High — deeply nested |
| **analytics.ts** | `getLineage` | `LineageResult` | High — recursive `LineageNode` tree |
| **analytics.ts** | `getEvolution` | `EvolutionResult` | Medium — `EvolutionPoint[]` + trend enums |
| **analytics.ts** | `getTranslation` | `TranslationAnalyticsResult` | Medium |
| **analytics.ts** | `compare` | `CompareResult` | Medium |
| **analytics.ts** | `getDiffImpact` | `DiffImpactResult` | High — nested diffs + taxonomy shifts |

## Implementation Plan

### Phase 0: Quick Win (0 new schemas, 1 file)
Wire existing `definitionSchema` to `translation.retranslate` — the schema already exists, just not passed at the call site.

**Files:** `src/operations/translation.ts`

### Phase 1: Simple Response Schemas (8 new schemas, 5 files)
Low-complexity types with flat or shallow structure.

**New schemas in `src/types/response-schemas.ts`** (new file, matching ops-sdk pattern):
- `validationResultSchema` — `{ valid, errors?: [{ path, message, code? }] }`
- `renderResultSchema` — `{ markdown, promptHash?, variables?, metadata?, target?, warnings? }`
- `targetWarningSchema` — `{ field, reason, level: 'info' | 'warn' | 'error' }` (used by renderResultSchema)
- `translatorVersionSchema` — `{ translatorVersion, releaseDate?, schema? }`
- `forkableCheckSchema` — `{ canFork, reason?, requiresSubscription? }`
- `publicUserSchema` — `{ id, username?, name?, bio?, websiteUrl?, avatar?, avatarMimeType? }`
- `modelSyncResultSchema` — `{ message?, providersAdded, providersUpdated, modelsAdded, modelsUpdated, duration? }`
- `providerSchema` — `{ id, name, logoUrl?, docUrl?, apiUrl?, status: 'active' | 'inactive' | 'deprecated' }`

**Wire to:** `render.get`, `render.preview`, `validation.validate`, `translation.getVersion`, `forks.checkForkable`, `users.get`, `models.sync`, `models.listProviders`

### Phase 2: List & Composite Response Schemas (~14 new schemas, 6 files)
Types that embed other schemas. `providerSchema` from Phase 1 is reused here.

**List response pattern** (from ops-sdk): For endpoints returning arrays, wrap inline with `z.array(itemSchema)` at the call site. For endpoints returning paginated objects (`{ definitions: [...], total, limit, offset }`), create named schemas. Also add generic factory functions `createApiResponseSchema<T>()` and `createListResponseSchema<T>()` for test infrastructure (not used in operations directly).

**New schemas in `src/types/response-schemas.ts`:**
- `definitionListItemSchema` — lighter than `definitionSchema`, subset of fields + `authorshipType?`
- `definitionListResponseSchema` — `{ definitions: definitionListItemSchema[], total, limit, offset, hasMore? }`
- `versionListItemSchema` — `{ id, version, hash, promptHash?, createdAt, createdBy, changeType?, changeSummary? }`
- `versionsListResponseSchema` — `{ versions: versionListItemSchema[], total, limit, offset }`
- `modelCapabilitiesSchema` — `{ vision, tools, streaming, extendedThinking, structuredOutput }`
- `modelSchema` — embeds `modelCapabilitiesSchema`, includes `regions?`, `releaseDate?`, `successor?`
- `modelsListResponseSchema` — `{ models: modelSchema[], total, limit, offset }`
- `aliasesListResponseSchema` — `{ aliases: modelAliasSchema[], total, limit, offset }`
- `modelAliasSchema` — `{ alias, provider, modelId, description?, scope?, deprecated?, ... }`
- `forkSchema` — `{ id, sourceDefinitionId, derivedDefinitionId, sourceVersion, createdAt }`
- `forkResponseSchema` — `{ definition: definitionSchema, fork: forkSchema, source: definitionListItemSchema, warnings?: string[] }`
- `forkLineageSchema` — `{ current: definitionListItemSchema, source: definitionListItemSchema.nullable().optional(), chain: z.array(definitionListItemSchema) }`
- `forkListResponseSchema` — `{ forks: ..., total, limit, offset }`
- `dependencyNodeSchema` + `dependencyEdgeSchema` + `dependencyGraphSchema` — `{ nodes[], edges[], cycleDetected, cycles? }`
- `upgradeResultSchema` — `{ definition: definitionSchema, version: string, changes: z.record(z.string(), z.unknown()) }`
- `batchUserResponseSchema` — `z.record(z.string(), publicUserSchema.nullable())`
- `aliasResolutionSchema` — `{ alias, target, model: modelSchema.nullable().optional() }`

**Wire to:** `definitions.list`, `versions.list`, `models.list`, `models.get`, `models.listAliases`, `models.resolveAlias`, `forks.create`, `forks.getAncestry`, `forks.list`, `dependencies.get`, `dependencies.getDependents`, `translation.upgrade`, `users.batch`

### Phase 3: Analytics Schemas (~11 new schemas, 2 files)
The most complex schemas — deeply nested metrics objects.

**Shared sub-schemas** (reused across analytics types):
- `failureDomainDistributionSchema` — `{ STR: number, SEM: number, PRA: number, EPI: number }`
- `healthFactorSchema` — `{ factor, score, weight, status: enum, detail, raw?: { value, threshold } }`
- `definitionRefSchema` — `{ type, name, version }` (appears in effectiveness, health, evolution, compare, diffImpact)

**Analytics schemas:**
- `effectivenessMetricsSchema` — nested with `failureDomainDistributionSchema`
- `compositionLiftResultSchema` — includes `constituentAgentMetrics[]`, `liftStatistics?`
- `definitionEffectivenessSchema` — `{ definition, period, metrics: { ... }, stale }`
- `definitionHealthSchema` — `{ healthScore, grade, provisional, caveats, issueProfile?, factors[], stale }`
- `ecosystemOverviewSchema` — nested `{ definitions, execution, effectiveness }` with top performers/needs attention arrays
- `lineageNodeSchema` — **recursive**, requires explicit type annotation: `const lineageNodeSchema: z.ZodType<LineageNode> = z.lazy(() => z.object({ ..., versions: z.array(lineageNodeSchema), forks: z.array(lineageNodeSchema) }))`
- `lineageResultSchema` — `{ root: lineageNodeSchema, totalVersions, totalForks, statistics }`
- `evolutionResultSchema` — `{ versions: EvolutionPoint[], trend: enum, trendConfidence, overallTrend, stale }`
- `translationAnalyticsResultSchema` — `{ groups: TranslatorGroupMetrics[], upgradeAvailable, projectedImprovement?, recommendation?, stale }`
- `compareResultSchema` — `{ definition, versions: VersionComparisonEntry[], stale }`
- `diffImpactResultSchema` — `{ diff, from, to, deltas, categorizedChanges[], taxonomyShift?, caveats[], stale }`

**Wire to:** all 8 analytics operations

### Phase 4: Version Diff — 5 Shapes (5 schemas, 1 file)

The `versions.diff()` endpoint returns different shapes based on two parameters:

| `full` | `format` | Return Type | Schema |
|--------|----------|-------------|--------|
| `true` | (ignored) | `VersionDiff` | `versionDiffSchema` |
| omitted/false | omitted (default) | `VersionDiffSummary` | `versionDiffSummarySchema` |
| omitted/false | `'fields'` | `VersionFieldDiff` | `versionFieldDiffSchema` |
| omitted/false | `'unified'` | `VersionUnifiedDiff` | `versionUnifiedDiffSchema` |

All 4 shapes share a common base: `{ fromVersion, toVersion, fromHash, toHash, hasChanges, fromPromptHash, toPromptHash, hasPromptChanges }`. Extract as `versionDiffBaseSchema`.

**Schema selection mechanism:** Inside `versions.diff()`, use conditional logic to select the schema based on the options passed:

```typescript
const schema = options?.full
  ? versionDiffSchema
  : options?.format === 'fields'
    ? versionFieldDiffSchema
    : options?.format === 'unified'
      ? versionUnifiedDiffSchema
      : versionDiffSummarySchema;
```

### Phase 5: Tests

Following the ops-sdk test infrastructure pattern (contract-helpers + schema tests + operation tests):

**5a. Contract helpers** in `test/contract-helpers.ts` (new file):
- **Mock data factories**: One `createMock*()` function per response schema. Each factory accepts `overrides: Partial<z.infer<typeof Schema>>` and calls `safeParse` on the built object — bad test fixtures fail immediately at test time, not at runtime. Guard with `STRICT_CONTRACTS` env flag.
- **Nock helpers**: `mockValidatedEndpoint()` validates mock data against the schema before registering the nock interceptor. `mockValidatedListEndpoint()` for array responses.
- **Re-exports**: All response schemas re-exported from contract-helpers so test files need only one import.

**5b. Schema unit tests** in `test/response-schemas.test.ts` (new file):
- Test each schema with `safeParse` against valid factory data — assert success
- Test rejection of malformed data — omit a required field, assert failure
- Test nullable fields accept both `null` and the typed value

**5c. Operation integration tests** in existing test files:
- For each operation group, add two tests (ops-sdk pattern):
  1. Missing required field → `rejects.toThrow(/API response validation failed/)`
  2. Wrong field type → `rejects.toThrow(/API response validation failed/)`
- Match on message string, not error class, for resilience
- Add `afterEach` nock pending-interceptor check: unconsumed interceptors = broken URL in test

## Schema Design Principles

Following the ops-sdk patterns exactly for cross-SDK consistency:

1. **Reuse shared sub-schemas** — `definitionListItemSchema`, `failureDomainDistributionSchema`, `healthFactorSchema`, `definitionRefSchema` appear in multiple response types
2. **Use enum schemas from existing constants** — `DEFINITION_TYPES`, `DOMAINS`, `AGENT_TYPES`, etc. already have `as const` arrays ready for `z.enum()`
3. **Use `.nullable()` and `.optional()` separately, never `.nullish()`** — `.nullable()` = DB column allows NULL (field always present, value may be null). `.optional()` = API sometimes omits the field entirely (e.g., stripped by serializer, legacy field). `.nullable().optional()` = nullable when present but sometimes omitted. `.nullish()` is reserved for input schemas only — the API never sends `undefined`, so response schemas should not accept it.
4. **Use `z.lazy()` for recursive types AND file-ordering breaks** — `LineageNode` is genuinely recursive and requires `const lineageNodeSchema: z.ZodType<LineageNode> = z.lazy(...)`. Also use `z.lazy()` to break forward-reference cycles when a schema defined earlier in the file embeds one defined later (ops-sdk pattern from `SaveRunResponseSchema`).
5. **Validate at the operation layer** — pass `{ schema }` to HTTP client calls, same pattern as definitions.ts
6. **Default `.strip()` behavior (no `.passthrough()`)** — matches ops-sdk. Unknown fields from API additions are silently stripped. This means the SDK only exposes fields it has typed, and future API additions don't cause validation failures but also don't reach consumers. This is the deliberate trade-off: strict typed contracts over forward-compatible pass-through.
7. **New schemas go in `src/types/response-schemas.ts`** — separate from existing `schemas.ts` (which holds input/shared schemas). Matches the ops-sdk file organization.
8. **`DateTimeStringSchema` and `NullableDateTimeSchema` shared primitives** — dual-format datetime handling: `z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))`. Reuse for all timestamp fields (`createdAt`, `updatedAt`, `publishedAt`, `deprecatedAt`, etc.).

## Pre-Implementation Verification

Before writing schemas, verify that TypeScript interfaces match actual API responses:

1. For each operation family (analytics, models, forks, etc.), make one real API call and compare the response shape to the TypeScript interface
2. Flag any drift — the schema should match the **API response**, not the TypeScript interface if they disagree
3. Fix the TypeScript interface first, then write the schema

This prevents the scenario where schemas enforce a drifted interface and throw `ResponseValidationError` on valid API responses.

## Estimated Scope

| Phase | New Schemas | Files Modified | Complexity |
|-------|-------------|----------------|------------|
| 0 | 0 | 1 | Trivial |
| 1 | 8 | 5 (+1 new) | Low |
| 2 | ~17 | 6 | Medium |
| 3 | ~11 | 2 | High |
| 4 | 5 | 1 | Medium |
| 5 | 0 | 3 test files (+1 new contract-helpers) | Medium |
| **Total** | **~41** | **~16** | |

After completion: **40/40 HTTP calls validated (100%)**, up from 8/40 (20%). The 1 void call (`definitions.remove`) is intentionally excluded.

## Risk

Low — all changes are additive. Adding schema validation to a call site cannot break existing behavior unless the API is already returning data that doesn't match the TypeScript types.

If a mismatch is discovered, it's a **bug worth surfacing** — but it should be surfaced during the pre-implementation verification step (above), not in production. The default `.strip()` behavior means API-added fields are silently dropped rather than causing validation failures — this is the same trade-off the ops-sdk makes.

The `schema.parse()` call in the HTTP client throws `ResponseValidationError` (from `@uluops/sdk-core/errors`) on mismatch, which is a clear signal to the consumer rather than silent corruption.
