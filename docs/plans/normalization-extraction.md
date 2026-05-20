# Extract Definition Normalization into @uluops/registry-sdk

## Context

The involuntary-audience pipeline (run #34, 2026-05-19) surfaced composition insight CMP-1: **the workaround topology IS the real API surface.** @uluops/core's RegistryClient.ts (742 lines) wraps the registry SDK with CDL/WDL/PDL normalization, local file resolution, render fallback, and caching — because the SDK returns raw API responses that don't match what executors need. Any non-trivial consumer converges on building equivalent normalization. The fix: move the normalization layer into the SDK itself so it's canonical and reusable.

## What Moves

Six private methods (~195 lines) from `/Users/aself/uluops/packages/-uluops-core/src/registry/RegistryClient.ts`:

| Function | Lines | Purpose |
|----------|-------|---------|
| `normalizeCommandDefinition` | 352-388 | `invokes.agent/agents` → `agents[]`, preflight/postflight → `execution.*`, `overrides.threshold` → `execution.thresholds.pass` |
| `normalizeWorkflowDefinition` | 403-438 | `steps[].command` → `commands[]`, `condition` → `skip_if` (negated), default `gate.aggregate` |
| `normalizePipelineDefinition` | 447-461 | Infer `stage.type` from `agents[]` or `ref` presence |
| `validateWorkflowStructure` | 470-482 | Guard: orchestration exists, phases is array |
| `validatePipelineStructure` | 489-495 | Guard: stages is array |
| `castDefinition` | 301-338 | Orchestrator: find top key, dispatch to normalizer + validator |

**Key insight:** These are all pure functions on `Record<string, unknown>` — no IO, no Node.js APIs, no yaml parsing, fully browser-safe.

## Design Decisions

1. **New subpath export:** `@uluops/registry-sdk/normalization` — follows existing pattern (`/config`, `/errors`, `/types`)
2. **Immutable transforms:** Return new objects via `structuredClone()` (Node >=18 guaranteed). Current in-place mutation is a footgun for a shared library.
3. **SDK owns lightweight normalized types:** `NormalizedCommandSection`, `NormalizedWorkflowSection`, `NormalizedPipelineSection` — describe the output shape without importing core's full execution types.
4. **Error type:** SDK's existing `ValidationError` (from `@uluops/sdk-core/errors`). Core wraps to `ConfigurationError` at the boundary.
5. **Public API:** `normalizeDefinition()` as main entry point (renamed from `castDefinition` — it normalizes, not casts). Individual normalizers also exported for advanced use.
6. **No `yaml` dependency:** Normalizers take parsed objects, not YAML strings. Parsing stays in core.
7. **No client method yet:** Standalone functions first. `client.definitions.getResolved()` can come in a follow-up.

## Phases

### Phase 1: Create normalization module in SDK

**New files:**
- `src/normalization/types.ts` — lightweight normalized section types
- `src/normalization/normalize-command.ts` — CDL normalizer
- `src/normalization/normalize-workflow.ts` — WDL normalizer
- `src/normalization/normalize-pipeline.ts` — PDL normalizer
- `src/normalization/validate-structure.ts` — structural guards
- `src/normalization/normalize-definition.ts` — orchestrator (`normalizeDefinition()`)
- `src/normalization/index.ts` — barrel export

All in `/Users/aself/uluops/packages/-uluops-registry-sdk/src/normalization/`.

### Phase 2: Add subpath export

**Modify:** `package.json` — add `"./normalization"` to exports map:
```json
"./normalization": {
  "import": "./dist/normalization/index.js",
  "types": "./dist/normalization/index.d.ts"
}
```

### Phase 3: Write tests

**New file:** `test/normalization.test.ts`

Key test categories:
- Each normalizer: transforms correct fields, preserves existing fields, handles missing input gracefully
- **Immutability:** input object not mutated (critical behavioral change from core's in-place mutation)
- **Parity:** output matches current core normalizer output for same input fixtures
- Validators: throw on invalid structure, pass on valid
- Orchestrator: detects top key, dispatches correctly, throws for invalid definitions

### Phase 4: Version bump + build

**Modify:**
- `package.json` — version `0.21.5` → `0.22.0`
- `src/config/constants.ts` — `SDK_VERSION` constant
- `CHANGELOG.md` — add `[0.22.0]` section

**Verify:** `npm run build && npm test`

### Phase 5: Migrate core to use SDK normalizers

**Modify:** `/Users/aself/uluops/packages/-uluops-core/src/registry/RegistryClient.ts`

1. Add import: `import { normalizeDefinition } from '@uluops/registry-sdk/normalization'`
2. Replace `this.castDefinition(parsed)` calls (lines 180, 264) with SDK's `normalizeDefinition()`
3. Wrap SDK's `ValidationError` → core's `ConfigurationError` at boundary
4. **Delete** the six private methods (~195 lines removed)

**Verify:** `npm run build && npm test` in core

### Phase 6: Write ADR-003

**New file:** `/Users/aself/uluops/packages/-uluops-registry-sdk/ADR-003-definition-normalization.md`

Content: Status, context (CMP-1 finding), decision, key choices (immutable, subpath, error mapping), consequences (+200 lines SDK, -195 lines core, canonical normalization for all consumers).

## Verification

1. SDK builds and all tests pass (`npm run build && npm test` in SDK)
2. Core builds and all tests pass (`npm run build && npm test` in core)
3. Subpath importable: `node -e "import('@uluops/registry-sdk/normalization').then(m => console.log(Object.keys(m)))"`
4. End-to-end: run a local definition resolution through core to verify normalized shapes are identical
5. `prepublishOnly` passes (SDK version consistency check)

## Files Summary

**SDK — create:**
- `src/normalization/types.ts`
- `src/normalization/normalize-command.ts`
- `src/normalization/normalize-workflow.ts`
- `src/normalization/normalize-pipeline.ts`
- `src/normalization/validate-structure.ts`
- `src/normalization/normalize-definition.ts`
- `src/normalization/index.ts`
- `test/normalization.test.ts`
- `ADR-003-definition-normalization.md`

**SDK — modify:**
- `package.json` (exports + version)
- `src/config/constants.ts` (SDK_VERSION)
- `CHANGELOG.md`

**Core — modify:**
- `src/registry/RegistryClient.ts` (import SDK normalizers, delete 195 lines)

**Core — verify only:**
- `src/types/command.ts`, `src/types/workflow.ts`, `src/types/pipeline.ts` (unchanged, executors still consume these)
