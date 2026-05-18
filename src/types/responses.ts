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

/**
 * Rendered definition response
 */
/** Warning from a target adapter about lossy or unmappable fields. */
export interface TargetWarning {
  field: string;
  reason: string;
  level: 'info' | 'warn' | 'error';
}

export interface RenderResult {
  markdown: string;
  promptHash?: string | null;
  variables?: string[];
  metadata?: Record<string, unknown>;
  /** Which target was rendered (only present when target param was specified) */
  target?: string;
  /** Adapter warnings about lossy mappings (only present for target rendering) */
  warnings?: TargetWarning[];
}

/** Render profile preset for controlling UluOps-specific agent prompt content. */
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
  definition: import('./definitions.js').Definition;
  version: string;
  changes: Record<string, unknown>;
}

/**
 * Execution recording body
 */
export interface RecordExecutionBody {
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
