/**
 * Model catalog types for the Registry SDK
 */

import type { ModelStatus, ModelTier } from './enums.js';

/**
 * Model capabilities flags
 */
export interface ModelCapabilities {
  vision: boolean;
  tools: boolean;
  streaming: boolean;
  extendedThinking: boolean;
}

/**
 * AI model entity
 */
export interface Model {
  provider: string;
  modelId: string;
  displayName: string;
  description: string;
  providerModelId: string;
  capabilities: ModelCapabilities;
  tier: ModelTier;
  status: ModelStatus;
  regions?: string[] | null;
  releaseDate?: string | null;
  deprecationDate?: string | null;
  successor?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Model alias for shorthand references
 */
export interface ModelAlias {
  alias: string;
  targetProvider: string;
  targetModelId: string;
  scope: 'global' | 'user' | 'team';
  deprecated: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Alias resolution result
 */
export interface AliasResolution {
  alias: string;
  resolved: boolean;
  provider?: string | null;
  modelId?: string | null;
  deprecated: boolean;
  model?: Model | null;
}

/**
 * AI provider info
 */
export interface Provider {
  id: string;
  displayName: string;
  website?: string;
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
  message: string;
  synced: number;
  created: number;
  updated: number;
  deleted: number;
}
