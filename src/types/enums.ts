/**
 * Definition type enums and value constants for the Registry SDK
 */

// Definition types
export const DEFINITION_TYPES = ['agent', 'command', 'workflow', 'pipeline'] as const;
export type DefinitionType = (typeof DEFINITION_TYPES)[number];

// Lifecycle status
export const DEFINITION_STATUSES = ['draft', 'published', 'deprecated', 'archived'] as const;
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

/**
 * Quality/provenance tiers — who authored and endorsed the definition.
 * - `user`: community-contributed
 * - `org`: organization-endorsed
 * - `pro`: platform-curated (UluOps team)
 *
 * Not to be confused with {@link SubscriptionTier} which gates content access.
 * Both contain `'pro'` but with different semantics: Tier.pro = authorship,
 * SubscriptionTier.pro = subscription level.
 */
export const TIERS = ['user', 'org', 'pro'] as const;
export type Tier = (typeof TIERS)[number];

/**
 * Subscription tiers — content access gating based on user plan.
 * Controls which definitions a user can access via `minSubscription`.
 *
 * Not to be confused with {@link Tier} which describes authorship provenance.
 */
export const SUBSCRIPTION_TIERS = ['free', 'hobbyist', 'plus', 'pro', 'enterprise'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

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
export const SORT_FIELDS = ['name', 'createdAt', 'updatedAt', 'executionCount', 'uniqueExecutionCount'] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];
