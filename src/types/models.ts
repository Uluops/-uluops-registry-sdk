/**
 * Model catalog types for the Registry SDK
 */

import type { ModelStatus, ModelTier } from './enums.js';

/**
 * Model capabilities flags
 */
export interface ModelCapabilities {
  vision?: boolean;
  tools?: boolean;
  streaming?: boolean;
  extendedThinking?: boolean;
  /** Supports structured (JSON-schema) output on its own. */
  structuredOutput?: boolean;
  /** Supports structured output AND tool calling in the same request. Absent or
   * true means allowed; false means the provider rejects the combination (e.g.
   * Google/Gemini returns a 400). Consumers sending tools should fall back to
   * text extraction when this is false. */
  structuredOutputWithTools?: boolean;
}

/**
 * Model token limits.
 *
 * `context` is the model's maximum context window (input + output) in tokens.
 * Optional because the list endpoint historically omitted it and some
 * upstream-synced rows have a null/0 limit.
 */
export interface ModelLimits {
  context: number;
  output: number;
}

/**
 * AI model entity
 */
export interface Model {
  provider: string;
  modelId: string;
  displayName?: string;
  description?: string;
  providerModelId?: string;
  capabilities: ModelCapabilities;
  limits?: ModelLimits;
  tier: ModelTier;
  status: ModelStatus;
  regions?: string[] | null;
  releaseDate?: string | null;
  deprecationDate?: string | null;
  successor?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Model alias for shorthand references
 */
export interface ModelAlias {
  alias: string;
  provider: string;
  modelId: string;
  description?: string;
  scope?: 'global' | 'user' | 'team';
  deprecated?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Alias resolution result
 */
export interface AliasResolution {
  alias: string;
  target: string;
  model?: Model | null;
}

/**
 * AI provider info
 */
export interface Provider {
  id: string;
  name: string;
  logoUrl?: string;
  docUrl?: string;
  apiUrl?: string;
  status: 'active' | 'inactive' | 'deprecated';
}

/**
 * Query parameters for listing models
 */
export interface ListModelsQuery {
  provider?: string;
  tier?: ModelTier;
  status?: ModelStatus;
  capability?: keyof ModelCapabilities;
}

/**
 * Model sync response
 */
export interface ModelSyncResult {
  message?: string;
  providersAdded: number;
  providersUpdated: number;
  modelsAdded: number;
  modelsUpdated: number;
  duration?: string | number;
}
