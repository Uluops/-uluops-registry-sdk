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
  errors?: ValidationError[];
}

/**
 * Individual validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  code?: string;
}

/**
 * Rendered definition response
 */
export interface RenderResult {
  markdown: string;
  variables?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Preview render request body
 */
export interface RenderPreviewBody {
  yaml: string;
  sourcePath?: string;
}

/**
 * Translator version info
 */
export interface TranslatorVersion {
  version: string;
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
