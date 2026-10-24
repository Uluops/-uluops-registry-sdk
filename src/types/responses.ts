/**
 * Common response types for the Registry SDK
 */

import type { PreviewPublish, RenderValidation } from './response-schemas.js';

/**
 * Single resource response wrapper
 */
export interface SingleResponse<T> {
  data: T;
}

/**
 * Paginated list response wrapper
 */
export interface PaginatedResponse<T> {
  data: {
    items: T[];
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * Error response from the API
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Validation result response
 */
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationFieldError[];
  /**
   * Warnings (0.64.0). The server always sent them; until 0.64.0 the SDK stripped them. For agents
   * this includes the factory's `UNRENDERED_KEY`: a field the schema accepts that no template of
   * the agent's type renders (registry-api ADL v1.20 P0c).
   */
  warnings?: ValidationFieldError[];
  /** The schema version the definition was validated against. */
  schemaVersion?: string;
  /** When the server validated (ISO 8601). */
  validatedAt?: string;
  /**
   * ADL only (registry-api ADL v1.20 P0c): the closure mode validation ran under — the registry's
   * fresh mode, the same as the publish gate's — and how many diagnostics it demoted from an error.
   * `valid` therefore predicts publish's validation check only; publish also refuses on blocking
   * dependencies and translation failure (preview's `publish.publishable` has the whole decision).
   */
  closure?: { mode: ClosureModeName; demoted: number };
}

/**
 * A closure mode (ADL v1.20 closure spec S1 §2.3). An open string: the factory owns the set and a
 * release may extend it, so branch on the values you know and treat the rest as unknown.
 * `legacy` is the registry's mode for stored rows; the CLI never runs it.
 */
export type ClosureModeName = 'error' | 'warn' | 'legacy' | (string & {});
// `warn` gives the same verdict as `error` until the factory's P1a, which reports v1.20's new
// closures as warnings under it; `error` becomes the fresh default at P2.

/**
 * Which legacy stamp a render carries: `unknown-keys` (every demotion was an unknown key) or
 * `some-errors`. An open string, as {@link ClosureModeName}. Not a severity: `unknown-keys` can
 * hide more lost intent than `some-errors`.
 */
export type LegacyWording = 'unknown-keys' | 'some-errors' | (string & {});

/**
 * The closure qualifier of a render (registry-api ADL v1.20 P0c; RG-1). Three referents:
 * - `/render`: the legacy re-render returned beside it;
 * - preview: the publish verdict's translation render, NOT the draft `markdown`/`promptHash` beside
 *   it (absent when translation did not run or failed);
 * - a definition read: the row's STORED live render (`runtimeMd`).
 *
 * `legacyWording` names the regime; the registry compares renders by it alone (`mode` and
 * `demoted` are reported, not compared). Equal `legacyWording` is not equal bytes: compare
 * `promptHash` under the same `renderStack` for that.
 */
export interface RenderClosure {
  mode: ClosureModeName;
  /** Diagnostics the mode demoted from an error. */
  demoted: number;
  /** Set exactly when the render carries the legacy stamp; `null` otherwise. */
  legacyWording: LegacyWording | null;
}

/**
 * Result of a successful login via `RegistryClient.login()`.
 */
export interface LoginResult {
  sessionToken: string;
  expiresAt?: string;
}

/**
 * Individual field-level validation error from the API.
 *
 * Renamed from `ValidationError` to avoid collision with the SDK's
 * `ValidationError` error class (thrown on invalid input).
 */
export interface ValidationFieldError {
  /**
   * Where the finding is. For agents, an RFC 6901 pointer that includes the offending key
   * (registry-api ADL v1.20 P0c). **Optional since 0.64.0**: the server omits it on whole-document
   * errors (`PAYLOAD_TOO_LARGE`, `INVALID_ENCODING`), which until then made the SDK throw.
   */
  path?: string;
  message: string;
  /** Machine-readable code. For agents, the factory's `DiagnosticCode` (`UNKNOWN_KEY`,
   *  `UNKNOWN_FAILURE_MODE`, …); an open set. */
  code?: string;
  /** `error`, `warning` or `info` today; validated as a string so a new level cannot throw. */
  severity?: string;
  suggestion?: string;
  line?: number;
  column?: number;
  /** Which layer wrote the message: `domain` (hand-written) or `schema` (JSON Schema). */
  source?: string;
  /** The offending key, where the factory names one (agents). */
  key?: string;
  /** Set when the closure mode lowered this finding from an error (agents). */
  demotedFrom?: string;
}

/** Warning from a target adapter about lossy or unmappable fields. */
export interface TargetWarning {
  field: string;
  reason: string;
  level: 'info' | 'warn' | 'error';
}

/** Rendered definition response */
export interface RenderResult {
  markdown: string;
  promptHash?: string | null;
  variables?: string[];
  metadata?: Record<string, unknown>;
  /** Which target was rendered (only present when target param was specified) */
  target?: string;
  /** Effective UluOps prompt profile selected by the server. */
  renderProfile?: RenderProfile;
  /** Model value emitted in the artifact envelope; null means no model envelope.
   * Omitted when an older server does not report selection. This is not provider resolution. */
  selectedModel?: string | null;
  /** Adapter warnings about lossy mappings (target rendering), and on every command render
   *  `[unresolved-agent]` (level `error`) when the invoked agent's sections are absent. Never
   *  validation diagnostics: those are in `validation`. */
  warnings?: TargetWarning[];
  /** The normalized YAML the server hashed. */
  normalizedYaml?: string;
  /** The installed `@uluops/definition-factory` version that produced `markdown`/`promptHash`. */
  factoryVersion?: string;
  /**
   * The resolved versions the server rendered with. **Pin a `core` hash on
   * `(definition version, renderStack)`**, not on `promptHash` or `factoryVersion` alone: the
   * factory takes `nunjucks` and `yaml` on caret ranges, so a lockfile change can move bytes
   * under an unchanged factory version. A mismatch under an unchanged stack is a regression; one
   * under a changed stack is churn.
   */
  renderStack?: RenderStack;
  /** ADL only: the profile the factory resolved (`custom` for a config object). */
  resolvedProfile?: 'core' | 'uluops-full' | 'custom';
  /** ADL only: whether the factory's role scaffolding rendered. `false` = a declared-only render. */
  scaffolding?: boolean;
  /**
   * ADL only: whether the definition declares an output shape its role renders. Under `core`,
   * `false` means a free-form agent with no output contract; the factory makes no runnability
   * guarantee for `core`.
   */
  declaredOutputShape?: boolean;
  /**
   * ADL only (registry-api ADL v1.20 P0c): validation grouped by code, key, severity and demotion;
   * never in `warnings`. On `/render` of a stored agent it runs under `legacy`: how the registry
   * reads this stored row, not whether the YAML would publish today (`valid` can be true where
   * `/validate` says false). On preview it is the publish verdict's, under the fresh mode. Tell them
   * apart by `mode`. A `/render` 422 carries it as `details.validation` (and `details.closure`).
   */
  validation?: RenderValidation;
  /** ADL only (registry-api ADL v1.20 P0c): the closure qualifier. On preview it qualifies the
   *  verdict's translation render, not this object's `markdown` (see {@link RenderClosure}). */
  closure?: RenderClosure;
  /**
   * Preview only (registry-api ADL v1.20 P0c): what publishing this YAML would decide —
   * validation, the dependency verdict as the caller's org sees it, and translation. Its `warnings`
   * are validation diagnostics, not the notices a real publish returns in `PublishResult.warnings`.
   */
  publish?: PreviewPublish;
}

/** The renderer versions behind a render response (spec 25 D12). */
export interface RenderStack {
  factory: string;
  nunjucks: string;
  yaml: string;
}

/**
 * Render profile preset.
 *
 * - `'core'`: the definition factory's own gloss (`CORE_PROFILE_GLOSS`, factory >= 0.81.0) reads
 *   "'core' renders only what the definition declares — no factory-supplied output contract,
 *   scoring instruction or tone; pass 'uluops-full' for the full prompt." Before factory 0.81.0
 *   (registry-api before the 0.81.0 deploy) `core` was the full role prompt minus four UluOps
 *   blocks.
 * - `'uluops-full'`: the full prompt, and the profile the registry stores at publish.
 */
export type RenderProfile = 'core' | 'uluops-full';

/**
 * Preview render request body
 */
export interface RenderPreviewBody {
  yaml: string;
  sourcePath?: string;
  renderProfile?: RenderProfile;
}

/**
 * Translator version info
 */
export interface TranslatorVersion {
  translatorVersion: string;
  releaseDate?: string;
  schema?: string;
}

/**
 * Retranslate request options
 */
export interface RetranslateOptions {
  createNewVersion?: boolean;
}

/**
 * Upgrade legacy definition request
 */
export interface UpgradeDefinitionBody {
  yaml: string;
}

/**
 * Upgrade result response
 */
export interface UpgradeResult {
  type: import('./enums.js').DefinitionType;
  name: string;
  version: string;
  previousVersion: string;
  translatorVersion: string;
  upgraded: true;
  /** Artifact metadata is absent on older API versions. */
  promptHash?: string;
  schemaVersion?: string;
}

/**
 * Execution recording body
 */
export interface RecordExecutionBody {
  /** Source identifier for analytics attribution (e.g., 'cli', 'api', 'sdk', 'mcp') — free-form string */
  source: string;
  runId?: string;
}

/**
 * Execution recording result
 */
export interface RecordExecutionResult {
  recorded: boolean;
  duplicate: boolean;
  definition: {
    id: string;
    type: string;
    name: string;
    version: string;
  };
  executionCount: number;
}

/**
 * Execution statistics
 */
export interface ExecutionStats {
  totalCount: number;
  recentCount: number;
  windowMinutes: number;
}

/**
 * Star status result.
 * Returned by star/unstar/getStatus operations.
 */
export interface StarResult {
  starred: boolean;
  starCount: number;
}
