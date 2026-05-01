# Registry SDK: Zod Response Validation Expansion

## Problem

Only 8 of 35 HTTP calls (23%) validate API responses with Zod schemas. The remaining 27 calls use `as T` casts — TypeScript types are enforced at compile-time only, with no runtime guarantee. If the API response drifts from the expected shape, consumers get silent data corruption rather than a clear `ResponseValidationError`.

This was already addressed in the ops-sdk a few weeks back. Same pattern applies here.

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

### Unvalidated — Needs New Schemas (26 calls)

| File | Operation | Return Type | Complexity |
|------|-----------|-------------|------------|
| **definitions.ts** | `list` | `DefinitionListResponse` | Medium — contains `DefinitionListItem[]` |
| **versions.ts** | `list` | `VersionsListResponse` | Medium — contains `VersionListItem[]` |
| **versions.ts** | `diff` | `VersionDiff \| VersionDiffSummary \| VersionFieldDiff \| VersionUnifiedDiff` | High — 4 discriminated union shapes based on `format` param |
| **render.ts** | `get` | `RenderResult` | Low |
| **render.ts** | `preview` | `RenderResult` | Low (same schema) |
| **validation.ts** | `validate` | `ValidationResult` | Low |
| **translation.ts** | `getVersion` | `TranslatorVersion` | Low |
| **translation.ts** | `upgrade` | `UpgradeResult` | Medium — embeds `Definition` |
| **forks.ts** | `create` | `ForkResponse` | Medium — embeds `Definition` + `DefinitionListItem` |
| **forks.ts** | `checkForkable` | `ForkableCheck` | Low |
| **forks.ts** | `getLineage` | `ForkLineage` | Medium — embeds `DefinitionListItem[]` |
| **forks.ts** | `list` | `ForkListResponse` | Medium — contains list items |
| **dependencies.ts** | `get` | `DependencyGraph` | Medium — nodes + edges |
| **dependencies.ts** | `getDependents` | `DependencyGraph` | Medium (same schema) |
| **users.ts** | `get` | `PublicUser` | Low |
| **users.ts** | `batch` | `BatchUserResponse` | Medium — `Record<string, PublicUser \| null>` |
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

### Phase 0: Quick Win (1 schema, 1 file)
Wire `definitionSchema` to `translation.retranslate` — it already exists.

**Files:** `src/operations/translation.ts`

### Phase 1: Simple Response Schemas (8 new schemas, 4 files)
Low-complexity types with flat or shallow structure.

**New schemas in `src/types/schemas.ts`:**
- `validationResultSchema` — `{ valid, errors? }`
- `renderResultSchema` — `{ markdown, promptHash?, variables?, metadata?, target?, warnings? }`
- `targetWarningSchema` — `{ field, reason, level }` (used by renderResultSchema)
- `translatorVersionSchema` — `{ translatorVersion, releaseDate?, schema? }`
- `forkableCheckSchema` — `{ canFork, reason?, requiresSubscription? }`
- `publicUserSchema` — `{ id, username?, name?, bio?, ... }`
- `modelSyncResultSchema` — `{ message?, providersAdded, ... }`
- `providerSchema` — `{ id, name, status, ... }`

**Wire to:** `render.get`, `render.preview`, `validation.validate`, `translation.getVersion`, `forks.checkForkable`, `users.get`, `models.sync`, `models.listProviders`

### Phase 2: List & Composite Response Schemas (8 new schemas, 5 files)
Types that embed other schemas (Definition, DefinitionListItem, Model).

**New schemas:**
- `definitionListItemSchema` — lighter than `definitionSchema`, subset of fields
- `definitionListResponseSchema` — `{ definitions, total, limit, offset, hasMore? }`
- `versionListItemSchema` + `versionsListResponseSchema`
- `modelSchema` + `modelCapabilitiesSchema` + `modelsListResponseSchema` + `aliasesListResponseSchema`
- `forkResponseSchema` — embeds `definitionSchema` + `definitionListItemSchema`
- `forkLineageSchema` — embeds `definitionListItemSchema[]`
- `dependencyGraphSchema` — `{ nodes, edges, cycleDetected, cycles? }`
- `upgradeResultSchema` — embeds `definitionSchema`
- `batchUserResponseSchema` — `z.record(publicUserSchema.nullable())`
- `aliasResolutionSchema` — embeds optional `modelSchema`

**Wire to:** `definitions.list`, `versions.list`, `models.list`, `models.get`, `models.listAliases`, `models.resolveAlias`, `forks.create`, `forks.getLineage`, `forks.list`, `dependencies.get`, `dependencies.getDependents`, `translation.upgrade`, `users.batch`

### Phase 3: Analytics Schemas (8 new schemas, 1 file)
The most complex schemas — deeply nested metrics objects.

**New schemas:**
- `failureDomainDistributionSchema` — `{ STR, SEM, PRA, EPI }`
- `healthFactorSchema` — `{ factor, score, weight, status, detail, raw? }`
- `definitionEffectivenessSchema` — deeply nested with `EffectivenessMetrics`, `CompositionLiftResult`
- `definitionHealthSchema` — `healthScore`, `factors[]`, `issueProfile`
- `ecosystemOverviewSchema` — nested `definitions`, `execution`, `effectiveness`
- `lineageNodeSchema` — **recursive** (`z.lazy()` for `versions[]` and `forks[]`)
- `lineageResultSchema` — embeds `lineageNodeSchema`
- `evolutionResultSchema` — `EvolutionPoint[]` + trend enums
- `translationAnalyticsResultSchema` — `TranslatorGroupMetrics[]`
- `compareResultSchema` — `VersionComparisonEntry[]`
- `diffImpactResultSchema` — nested diffs + taxonomy shifts

**Wire to:** all 8 analytics operations

### Phase 4: Version Diff Discriminated Union (1 complex schema, 1 file)
The `versions.diff` endpoint returns one of 4 shapes based on the `format` query parameter. This needs a discriminated union schema or per-format schemas selected at the call site.

**Approach:** Create 4 individual schemas (`versionDiffSchema`, `versionDiffSummarySchema`, `versionFieldDiffSchema`, `versionUnifiedDiffSchema`) and select the appropriate one based on the `format` option passed to `versions.diff()`.

### Phase 5: Tests
Update existing tests to verify schema validation is applied:
- For each newly-validated operation, add a test that confirms a malformed response triggers `ResponseValidationError`
- Mirror the pattern used in existing definition operation tests

## Schema Design Principles

1. **Reuse shared sub-schemas** — `definitionListItemSchema`, `failureDomainDistributionSchema`, `healthFactorSchema` appear in multiple response types
2. **Use enum schemas from existing constants** — `DEFINITION_TYPES`, `DOMAINS`, `AGENT_TYPES`, etc. already have `as const` arrays ready for `z.enum()`
3. **Use `.nullish()` for optional nullable fields** — matches the TypeScript interface pattern used throughout
4. **Use `z.lazy()` for recursive types** — `LineageNode` references itself via `versions` and `forks` arrays
5. **Validate at the operation layer** — pass `{ schema }` to HTTP client calls, same pattern as definitions.ts

## Estimated Scope

| Phase | New Schemas | Files Modified | Complexity |
|-------|-------------|----------------|------------|
| 0 | 0 | 1 | Trivial |
| 1 | 8 | 5 | Low |
| 2 | ~12 | 6 | Medium |
| 3 | ~11 | 2 | High |
| 4 | 4 | 1 | Medium |
| 5 | 0 | ~10 test files | Medium |
| **Total** | **~35** | **~15** | |

After completion: **35/35 HTTP calls validated (100%)**, up from 8/35 (23%).

## Risk

Low — all changes are additive. Adding schema validation to a call site cannot break existing behavior unless the API is already returning data that doesn't match the TypeScript types (which would be a bug worth discovering).

The `z.parse()` call in the HTTP client throws `ResponseValidationError` on mismatch, which is a clear signal to the consumer rather than silent corruption.
