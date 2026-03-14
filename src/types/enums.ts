/**
 * Definition type enums and value constants for the Registry SDK
 */

// Definition types
export const DEFINITION_TYPES = ['agent', 'command', 'workflow', 'pipeline'] as const;
export type DefinitionType = (typeof DEFINITION_TYPES)[number];

// Lifecycle status
export const DEFINITION_STATUSES = ['draft', 'published', 'deprecated'] as const;
export type DefinitionStatus = (typeof DEFINITION_STATUSES)[number];

// Domain categories
export const DOMAINS = [
  'software',
  'security',
  'compliance',
  'legal',
  'medical',
  'financial',
  'scientific',
  'content',
  'general',
  'cognitive-lens',
] as const;
export type Domain = (typeof DOMAINS)[number];

// Agent subtypes (only for agent definitions)
export const AGENT_TYPES = ['validator', 'executor', 'analyst', 'generator', 'explorer', 'forecaster'] as const;
export type AgentType = (typeof AGENT_TYPES)[number];

// Ownership tiers
export const TIERS = ['user', 'public', 'pro'] as const;
export type Tier = (typeof TIERS)[number];

// Visibility levels
export const VISIBILITIES = ['private', 'unlisted', 'public'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

// Model pricing tiers
export const MODEL_TIERS = ['budget', 'standard', 'premium', 'reasoning'] as const;
export type ModelTier = (typeof MODEL_TIERS)[number];

// Model availability status
export const MODEL_STATUSES = ['available', 'preview', 'deprecated'] as const;
export type ModelStatus = (typeof MODEL_STATUSES)[number];

// Version change types
export const CHANGE_TYPES = ['major', 'minor', 'patch'] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

// Sort options for listing
export const SORT_FIELDS = ['name', 'createdAt', 'updatedAt', 'executionCount'] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];
