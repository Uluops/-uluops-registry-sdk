/**
 * Common response types for the Registry SDK
 */

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
  path: string;
  message: string;
  code?: string;
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
  /** Adapter warnings about lossy mappings (only present for target rendering) */
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
