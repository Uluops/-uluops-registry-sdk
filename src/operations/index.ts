/**
 * Operations exports for the Registry SDK
 *
 * Each namespace corresponds to a group of API endpoints accessible
 * through the {@link RegistryClient} (e.g. `client.definitions`, `client.models`).
 */

/** Definition CRUD and lifecycle operations (create, list, publish, deprecate) */
export * as definitions from './definitions.js';

/** Version history and diff operations */
export * as versions from './versions.js';

/** YAML schema validation */
export * as validation from './validation.js';

/** Dependency graph queries */
export * as dependencies from './dependencies.js';

/** Fork creation, lineage, and forkability checks */
export * as forks from './forks.js';

/** Execution recording and statistics */
export * as executions from './executions.js';

/** Schema version translation and upgrades */
export * as translation from './translation.js';

/** AI model catalog queries and alias resolution */
export * as models from './models.js';

/** Public user profile lookups */
export * as users from './users.js';

/** Definition rendering and preview */
export * as render from './render.js';

// Re-export response types
export type { DefinitionListResponse } from './definitions.js';
export type { ForkListResponse } from './forks.js';
export type {
  ModelsListResponse,
  ProvidersListResponse,
  AliasesListResponse,
} from './models.js';
