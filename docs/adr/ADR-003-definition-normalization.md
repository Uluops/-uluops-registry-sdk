# ADR-003: Definition Normalization Extraction

**Status:** Accepted  
**Date:** 2026-05-19  
**Deciders:** Alex Self  
**Context:** Involuntary-audience pipeline run #34 composition insight CMP-1 identified that 970 lines of consumer-built normalization code across @uluops/core (742 lines) and uluops-registry-mcp (228 lines) constitute the SDK's *real* API surface. Every non-trivial consumer independently converges on building the same normalization layer.

## Context

UDL definition languages (CDL, WDL, PDL) use an ergonomic authoring format that differs from the runtime structure executors expect:

- CDL: `invokes.agent` → `agents[]`, top-level preflight/postflight → `execution.*`
- WDL: `steps[].command` → `commands[]`, `condition` → `skip_if` (negated)
- PDL: stage type inferred from `agents[]` or `ref` presence

Prior to this change, the registry SDK returned raw API responses. Each consumer (@uluops/core, MCP server, CLI) had to build its own normalization. The @uluops/core RegistryClient.ts grew to 742 lines — most of which was normalization that belongs in the SDK.

## Decision

**Extract definition normalization into `@uluops/registry-sdk/normalization` as pure functions.**

The SDK provides canonical normalization that all consumers share, eliminating the need for consumer-side workaround layers.

## Key Design Choices

### Immutable transforms
All normalizers return new objects via `structuredClone()`. The previous core implementation mutated in-place, which is unsafe for a shared library where multiple consumers may hold references to the same parsed object.

### New subpath export
`@uluops/registry-sdk/normalization` follows the existing subpath pattern (`/config`, `/errors`, `/types`). Consumers who only need the HTTP client don't pay the import cost.

### Dedicated error type
`DefinitionValidationError` is distinct from the SDK's HTTP-oriented `ValidationError`. Structural validation of parsed YAML objects is a different concern from API response validation. Core maps `DefinitionValidationError` → `ConfigurationError` at the boundary.

### No YAML dependency
Normalizers take already-parsed `Record<string, unknown>` objects. YAML parsing remains a consumer responsibility. This keeps the normalization module browser-safe and dependency-free.

### Standalone functions first
No `client.definitions.getResolved()` convenience method in this release. The normalizers are standalone pure functions. A client-integrated API can follow once the standalone functions are proven in production.

## Consequences

### Positive
- SDK grows by ~200 lines but provides canonical normalization for all consumers
- Core shrinks by 188 lines (742 → 554) — the deleted code was normalization that now lives in the SDK
- MCP server and future consumers can normalize without depending on @uluops/core
- Immutable transforms are safer than the previous in-place mutation pattern
- Normalization is now independently testable (46 tests in SDK vs 0 dedicated tests before)

### Negative
- SDK surface area increases — one more subpath to maintain
- `structuredClone()` has a performance cost vs in-place mutation (negligible for definition-sized objects, but measurable for bulk operations)

### Neutral
- The type assertion at the core boundary (`definition as unknown as ResolvedDefinition['definition']`) remains — the SDK's `Record<string, unknown>` output and core's typed definition union are not structurally linked. A future phase could add Zod runtime validation to close this gap.

## Related

- **ADR-002**: Strict response validation — the normalization layer sits downstream of response validation. Raw API responses are Zod-validated first, then optionally normalized.
- **Tracker run #34**: Involuntary-audience pipeline that surfaced this change.
