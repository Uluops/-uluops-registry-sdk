# ADR-002: Strict Zod Response Validation (No Graceful Degradation)

**Status:** Accepted  
**Date:** 2026-05-18  
**Deciders:** Alex Self  
**Context:** Ship pipeline run #31 flagged "Zod schema tight coupling — no degradation path for API field changes" as a structural concern (PRA-FRA/H). This is the second time this architectural property has been surfaced by validation agents.

## Context

Every API response in the registry SDK is validated at runtime through Zod schemas in `src/types/response-schemas.ts`. If the API returns a response that doesn't match the schema (missing required field, changed type), the SDK throws `ResponseValidationError` immediately rather than returning partially-valid data.

This means the SDK and API must advance in lockstep. A breaking API change that isn't accompanied by an SDK update will cause hard failures for all consumers.

## Decision

**We accept strict response validation as an intentional architectural property.**

The SDK will continue to throw `ResponseValidationError` on schema mismatches with no lenient/partial parsing mode.

## Rationale

### Why strict is correct for this SDK

1. **Silent corruption is worse than loud failure.** The SDK serves as a typed contract boundary. Returning a `Definition` object where `executionCount` is suddenly `null` instead of `number` would cause downstream `TypeError` crashes at unpredictable points — harder to diagnose than a clear `ResponseValidationError` at the call site.

2. **The API and SDK are co-released.** Both are maintained by the same team, deployed together, and versioned in semver lockstep. The scenario of "API deploys breaking change, SDK doesn't update" only occurs during development, where the error is a helpful signal.

3. **`.strip()` handles additive changes.** Zod's default behavior silently drops unknown fields. This means the API can add new fields freely without causing SDK failures. Only *breaking* changes (removed fields, type changes) trigger validation errors — exactly the changes that require consumer awareness.

4. **Consumers can pin SDK versions.** If a consumer needs to operate against a newer API without updating, they pin the SDK version and accept the older contract. The alternative (lenient parsing) would give them data they haven't typed for, which is equally broken.

### Alternatives considered

| Alternative | Why rejected |
|-------------|-------------|
| Lenient mode (`safeParse` + return partial) | Consumers would operate on incomplete data without knowing the contract broke. Bugs surface later, harder to trace. |
| `.passthrough()` (forward all unknown fields) | Breaks type safety — consumers can't type fields they don't know about. Adds `Record<string, unknown>` noise to every response type. |
| Schema version negotiation | Over-engineering for a co-released system. Adds protocol complexity without real-world benefit. |
| Remove Zod entirely (trust TypeScript types) | Returns to pre-v0.16.0 state where `as T` casts masked real API drift. This caused actual bugs before Zod was added. |

## Consequences

### Positive
- Contract drift is detected immediately at the point of failure
- Error messages include the specific field and expected type (via ZodIssue)
- Consumers can catch `ResponseValidationError` distinctly from network errors
- Test infrastructure validates mock data against the same schemas (contract-helpers)

### Negative
- SDK and API versions must advance together (accepted constraint)
- A hot-fixed API that removes a field will break the SDK until patched (mitigated by semver discipline)
- Anxiety-reader and similar agents will continue to flag this as "fragility" because they evaluate degradation paths generically

### Operational
- API breaking changes → SDK patch release same day
- `prepublishOnly` script validates schemas compile cleanly
- Response-validation-wiring tests cover all 47 operations

## Related
- `uluops-specifications/specs/completed/registry-sdk-zod-validation-spec.md` — Implementation history and schema design principles (moved from SDK repo)
- `src/types/response-schemas.ts` — File header documents this decision inline
