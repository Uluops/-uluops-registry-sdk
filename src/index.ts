/**
 * @uluops/registry-sdk
 *
 * TypeScript SDK for the UluOps Registry API - manage AI workflow definitions
 * (agents, commands, workflows, pipelines).
 *
 * @example
 * ```typescript
 * import { RegistryClient } from '@uluops/registry-sdk';
 *
 * const client = new RegistryClient({
 *   apiKey: process.env.ULUOPS_API_KEY,
 * });
 *
 * // List agent definitions
 * const agents = await client.definitions.list({ type: 'agent' });
 *
 * // Get a specific definition
 * const def = await client.definitions.get('agent', 'my-agent', '1.0.0');
 * ```
 */

// Main client
export { RegistryClient, type RegistryClientConfig } from './client.js';
export type { LoginResult } from './types/responses.js';

// HTTP layer (for advanced use cases)
export {
  RegistryHttpClient,
  type HttpClientConfig,
} from './http/http-client.js';

export {
  ApiKeyAuth,
  JwtSessionAuth,
  createAuthStrategy,
  type AuthStrategy,
  type AuthConfig,
} from './http/auth-strategy.js';

// Re-export types for convenience
export type {
  // Enums
  DefinitionType,
  DefinitionStatus,
  Domain,
  AgentType,
  SubscriptionTier,
  Tier,
  Visibility,
  ModelTier,
  ModelStatus,
  ChangeType,
  SortField,
  SortOrder,
} from './types/enums.js';

export type {
  // Definition types
  Definition,
  DefinitionListItem,
  ListDefinitionsQuery,
  GetDefinitionOptions,
  CreateDefinitionBody,
  UpdateDefinitionBody,
  DeprecateDefinitionBody,
  Provenance,
  AuthorshipType,
  ContributorRole,
  ActorType,
  Contributor,
} from './types/definitions.js';

export type {
  // Version types
  VersionListItem,
  VersionDiff,
  VersionDiffSummary,
  VersionFieldDiff,
  VersionUnifiedDiff,
} from './types/versions.js';

export type { VersionsListResponse } from './operations/versions.js';
export type { RenderGetOptions } from './operations/render.js';
export type { DefinitionListResponse } from './operations/definitions.js';
export type { ForkListResponse, ForkEntry } from './operations/forks.js';
export type {
  ModelsListResponse,
  ProvidersListResponse,
  AliasesListResponse,
} from './operations/models.js';

export type {
  // Dependency types
  DependencyGraph,
  DependencyNode,
  DependencyEdge,
  GetDependenciesOptions,
} from './types/dependencies.js';

export type {
  // Fork types
  Fork,
  ForkSummary,
  ForkDefinitionBody,
  ForkResponse,
  ForkableCheck,
  ForkLineage,
  CheckForkableOptions,
} from './types/forks.js';

export type {
  // Model types
  Model,
  ModelAlias,
  AliasResolution,
  Provider,
  ModelCapabilities,
  ListModelsQuery,
} from './types/models.js';

export type {
  // User types
  PublicUser,
  BatchUserResponse,
} from './types/users.js';

export type {
  // Language types
  Language,
  LanguageSchema,
  LanguageWithSchema,
} from './types/languages.js';

export type { LanguagesListResponse } from './operations/languages.js';

export type {
  // Analytics types
  DefinitionEffectiveness,
  EffectivenessMetrics,
  DefinitionHealth,
  HealthFactor,
  FailureDomainDistribution,
  EcosystemOverview,
  LineageResult,
  LineageNode,
  LineageStatistics,
  EvolutionResult,
  EvolutionPoint,
  OverallTrend,
  TranslationAnalyticsResult,
  TranslatorGroupMetrics,
  ProjectedImprovement,
  CompareResult,
  VersionComparisonEntry,
  DiffImpactResult,
  CategorizedChange,
  TaxonomyShift,
  CompositionLiftResult,
  ConstituentAgentMetrics,
  LiftStatistics,
} from './types/analytics.js';

export type {
  // Response types
  SingleResponse,
  PaginatedResponse,
  ErrorResponse,
  ValidationResult,
  ValidationFieldError,
  RenderResult,
  RenderPreviewBody,
  RenderProfile,
  TargetWarning,
  TranslatorVersion,
  RetranslateOptions,
  UpgradeDefinitionBody,
  UpgradeResult,
  RecordExecutionBody,
  RecordExecutionResult,
  ExecutionStats,
  StarResult,
} from './types/responses.js';

// Re-export core types used in public config interfaces
export type { RateLimitInfo } from '@uluops/sdk-core';
