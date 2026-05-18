/**
 * Main Registry Client for the Registry SDK
 *
 * Provides a high-level interface to the UluOps Registry API for managing
 * AI workflow definitions (agents, commands, workflows, pipelines).
 *
 * @example
 * ```typescript
 * import { RegistryClient } from '@uluops/registry-sdk';
 *
 * const client = new RegistryClient({
 *   apiKey: process.env.ULUOPS_API_KEY,
 * });
 *
 * // List definitions
 * const result = await client.definitions.list({ type: 'agent' });
 *
 * // Get a specific definition
 * const def = await client.definitions.get('agent', 'my-agent', '1.0.0');
 *
 * // Create a new definition
 * const newDef = await client.definitions.create('agent', 'my-agent', {
 *   yaml: '...',
 *   visibility: 'private',
 * });
 * ```
 */

import { RegistryHttpClient } from './http/http-client.js';
import { JwtSessionAuth } from './http/auth-strategy.js';
import * as definitionsOps from './operations/definitions.js';
import * as versionsOps from './operations/versions.js';
import * as validationOps from './operations/validation.js';
import * as dependenciesOps from './operations/dependencies.js';
import * as forksOps from './operations/forks.js';
import * as executionsOps from './operations/executions.js';
import * as translationOps from './operations/translation.js';
import * as modelsOps from './operations/models.js';
import * as usersOps from './operations/users.js';
import * as renderOps from './operations/render.js';
import * as analyticsOps from './operations/analytics.js';
import * as starsOps from './operations/stars.js';

import type {
  Definition,
  ListDefinitionsQuery,
  GetDefinitionOptions,
  CreateDefinitionBody,
  UpdateDefinitionBody,
  DeprecateDefinitionBody,
} from './types/definitions.js';
import type { VersionDiff, VersionDiffSummary, VersionFieldDiff, VersionUnifiedDiff } from './types/versions.js';
import type { VersionsListResponse } from './operations/versions.js';
import type { DependencyGraph, GetDependenciesOptions } from './types/dependencies.js';
import type {
  ForkDefinitionBody,
  ForkResponse,
  ForkableCheck,
  ForkLineage,
  CheckForkableOptions,
} from './types/forks.js';
import type {
  Model,
  ListModelsQuery,
  AliasResolution,
  ModelSyncResult,
} from './types/models.js';
import type { PublicUser, BatchUserResponse } from './types/users.js';
import type {
  DefinitionEffectiveness,
  DefinitionHealth,
  EcosystemOverview,
  LineageResult,
  EvolutionResult,
  TranslationAnalyticsResult,
  CompareResult,
  DiffImpactResult,
} from './types/analytics.js';
import type {
  ValidationResult,
  RenderResult,
  RenderPreviewBody,
  RecordExecutionBody,
  RecordExecutionResult,
  ExecutionStats,
  StarResult,
  TranslatorVersion,
  RetranslateOptions,
  UpgradeDefinitionBody,
  UpgradeResult,
  LoginResult,
} from './types/responses.js';
import type { DefinitionType } from './types/enums.js';
import type { DefinitionListResponse } from './operations/definitions.js';
import type { ForkListResponse } from './operations/forks.js';
import type {
  ModelsListResponse,
  ProvidersListResponse,
  AliasesListResponse,
} from './operations/models.js';

/**
 * Client configuration options
 */
export interface RegistryClientConfig {
  /** API key for authentication (preferred) */
  apiKey?: string;
  /** Email for session-based auth */
  email?: string;
  /** Password for session-based auth */
  password?: string;
  /** Session token from ops-uluops-api */
  sessionToken?: string;
  /** Org slug for multi-tenancy — sets X-Org-Slug header on all requests */
  orgSlug?: string;
  /** Base URL for the registry API */
  baseUrl?: string;
  /** Base URL for the ops API (login/refresh) — defaults to https://api.uluops.ai/api/v1/ops, or localhost:3100 in development */
  authBaseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Number of retries for transient errors (default: 3) */
  retries?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Callback when token is refreshed */
  onTokenRefresh?: (token: string) => void;
}

/**
 * Main client for the UluOps Registry API
 */
export class RegistryClient {
  private readonly http: RegistryHttpClient;
  private readonly configTimeout?: number;
  private readonly configOnTokenRefresh?: (token: string) => void;

  /**
   * Definition operations (CRUD, publish, deprecate)
   */
  readonly definitions: {
    /** List definitions with optional filters and pagination. */
    list: (query?: ListDefinitionsQuery) => Promise<DefinitionListResponse>;
    /** Get a single definition by type and name. Omit version for latest published. */
    get: (type: DefinitionType, name: string, version?: string, options?: GetDefinitionOptions) => Promise<Definition>;
    /** Create a new draft definition from YAML. */
    create: (type: DefinitionType, name: string, body: CreateDefinitionBody) => Promise<Definition>;
    /** Update a draft definition. */
    update: (type: DefinitionType, name: string, version: string, body: UpdateDefinitionBody) => Promise<Definition>;
    /** Delete a draft definition. */
    delete: (type: DefinitionType, name: string, version: string) => Promise<void>;
    /** Publish a draft, making it discoverable. */
    publish: (type: DefinitionType, name: string, version: string) => Promise<Definition>;
    /** Deprecate a published definition with reason and optional replacement. */
    deprecate: (type: DefinitionType, name: string, version: string, body: DeprecateDefinitionBody) => Promise<Definition>;
    /** Archive a deprecated definition. Terminal state — removes from discovery. */
    archive: (type: DefinitionType, name: string, version: string) => Promise<Definition>;
  };

  /**
   * Version operations (list, diff)
   */
  readonly versions: {
    /** List all versions of a definition with optional pagination. */
    list: (type: DefinitionType, name: string, options?: { limit?: number; offset?: number }) => Promise<VersionsListResponse>;
    /** Compare two versions. Returns summary by default; pass full=true for raw YAML or format for fields/unified. */
    diff: {
      (type: DefinitionType, name: string, from: string, to: string, options: { full: true }): Promise<VersionDiff>;
      (type: DefinitionType, name: string, from: string, to: string, options: { format: 'fields' }): Promise<VersionFieldDiff>;
      (type: DefinitionType, name: string, from: string, to: string, options: { format: 'unified' }): Promise<VersionUnifiedDiff>;
      (type: DefinitionType, name: string, from: string, to: string, options?: { full?: boolean; format?: 'sections' | 'fields' | 'unified' }): Promise<VersionDiffSummary>;
    };
  };

  /**
   * Validation operations
   */
  readonly validation: {
    /** Validate YAML content without storing. Returns errors/warnings if any. */
    validate: (type: DefinitionType, yaml: string) => Promise<ValidationResult>;
  };

  /**
   * Dependency operations
   */
  readonly dependencies: {
    /** Get the dependency graph for a definition version. */
    get: (type: DefinitionType, name: string, version: string, options?: GetDependenciesOptions) => Promise<DependencyGraph>;
    /** Get definitions that depend on this definition version. */
    getDependents: (type: DefinitionType, name: string, version: string) => Promise<DependencyGraph>;
  };

  /**
   * Fork operations
   */
  readonly forks: {
    /** Fork a definition to create a new one under your ownership. */
    create: (type: DefinitionType, name: string, version: string, body: ForkDefinitionBody) => Promise<ForkResponse>;
    /** Check if a definition can be forked. */
    isForkable: (type: DefinitionType, name: string, version: string, options?: CheckForkableOptions) => Promise<ForkableCheck>;
    /** Get the fork ancestry chain of a definition. */
    getAncestry: (type: DefinitionType, name: string, version: string) => Promise<ForkLineage>;
    /** List all forks derived from a definition. */
    list: (type: DefinitionType, name: string, version: string) => Promise<ForkListResponse>;
  };

  /**
   * Execution statistics operations
   */
  readonly executions: {
    /** Record an execution of a definition. Idempotent if runId already recorded. */
    record: (type: DefinitionType, name: string, version: string, body: RecordExecutionBody) => Promise<RecordExecutionResult>;
    /** Get execution statistics for a definition. @param window - Time window in minutes (1-43200, default 60). */
    getStats: (type: DefinitionType, name: string, version: string, window?: number) => Promise<ExecutionStats>;
  };

  /**
   * Star operations (per-user per-definition, idempotent)
   */
  readonly stars: {
    /** Check if the authenticated user has starred a definition. */
    getStatus: (type: DefinitionType, name: string, version?: string) => Promise<StarResult>;
    /** Star a definition. Idempotent — no-op if already starred. */
    star: (type: DefinitionType, name: string, version?: string) => Promise<StarResult>;
    /** Unstar a definition. Idempotent — no-op if not starred. */
    unstar: (type: DefinitionType, name: string, version?: string) => Promise<StarResult>;
  };

  /**
   * Translation operations
   */
  readonly translation: {
    /** Get the current translator version. */
    getVersion: () => Promise<TranslatorVersion>;
    /** Retranslate a definition using the latest translator. */
    retranslate: (type: DefinitionType, name: string, version: string, options?: RetranslateOptions) => Promise<Definition>;
    /** Upgrade a legacy definition to the dual-storage format. */
    upgradeDefinition: (type: DefinitionType, name: string, body: UpgradeDefinitionBody) => Promise<UpgradeResult>;
  };

  /**
   * Model catalog operations
   */
  readonly models: {
    /** List models with optional filters (provider, capability). */
    list: (query?: ListModelsQuery) => Promise<ModelsListResponse>;
    /** Get a specific model by provider and model ID. */
    get: (provider: string, modelId: string) => Promise<Model>;
    /** List all model providers. */
    listProviders: () => Promise<ProvidersListResponse>;
    /** List all model aliases. */
    listAliases: () => Promise<AliasesListResponse>;
    /** Resolve a model alias (e.g., 'sonnet') to its target provider and model. */
    resolveAlias: (alias: string) => Promise<AliasResolution>;
    /** Sync models from models.dev. Requires admin role or pro subscription. */
    sync: () => Promise<ModelSyncResult>;
  };

  /**
   * User operations (read-only)
   */
  readonly users: {
    /** Get public user information by UUID. */
    get: (id: string) => Promise<PublicUser>;
    /** Batch lookup public user information (max 100 IDs). */
    batch: (ids: string[]) => Promise<BatchUserResponse>;
  };

  /**
   * Render operations
   */
  readonly render: {
    /** Get the rendered markdown for a stored definition version. */
    get: (type: DefinitionType, name: string, version: string, options?: renderOps.RenderGetOptions) => Promise<RenderResult>;
    /** Preview render YAML without storing. */
    preview: (type: DefinitionType, body: RenderPreviewBody) => Promise<RenderResult>;
  };

  /**
   * Analytics operations (effectiveness, health, lineage, evolution)
   *
   * Health scores are provisional pending 90-day calibration study.
   */
  readonly analytics: {
    /** Get effectiveness metrics (pass rate, scores, taxonomy breakdown). */
    getEffectiveness: (type: DefinitionType, name: string, version?: string) => Promise<DefinitionEffectiveness>;
    /** Get health grade (A-F) and issue profile. Provisional pending calibration. */
    getHealth: (type: DefinitionType, name: string, version?: string) => Promise<DefinitionHealth>;
    /** Get ecosystem-wide overview: counts, aggregate health, top performers. */
    getEcosystemOverview: () => Promise<EcosystemOverview>;
    /** Get lineage graph: versions and forks as a tree. */
    getLineage: (type: DefinitionType, name: string) => Promise<LineageResult>;
    /** Get version-over-version metrics with trend detection. */
    getEvolution: (type: DefinitionType, name: string) => Promise<EvolutionResult>;
    /** Get versions grouped by translator version with aggregate metrics. */
    getTranslation: (type: DefinitionType, name: string) => Promise<TranslationAnalyticsResult>;
    /** Compare effectiveness across 2-5 versions side-by-side. */
    compare: (type: DefinitionType, name: string, versions: string[]) => Promise<CompareResult>;
    /** Get structural diff combined with metric deltas between two versions. */
    getDiffImpact: (type: DefinitionType, name: string, fromVersion: string, toVersion: string) => Promise<DiffImpactResult>;
  };

  constructor(config: RegistryClientConfig = {}) {
    this.configTimeout = config.timeout;
    this.configOnTokenRefresh = config.onTokenRefresh;
    this.http = this.createHttpClient(config);
    this.definitions = this.bindDefinitions();
    this.versions = this.bindVersions();
    this.validation = this.bindValidation();
    this.dependencies = this.bindDependencies();
    this.forks = this.bindForks();
    this.executions = this.bindExecutions();
    this.stars = this.bindStars();
    this.translation = this.bindTranslation();
    this.models = this.bindModels();
    this.users = this.bindUsers();
    this.render = this.bindRender();
    this.analytics = this.bindAnalytics();
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Login with email and password via the ops-uluops-api.
   * The registry API has no auth endpoints — login is delegated to the ops API.
   *
   * @param email - User email address
   * @param password - User password
   * @returns Session token and optional ISO 8601 expiry timestamp
   * @throws {Error} If the client was constructed with API key auth (use session-based auth instead)
   * @throws {UnauthorizedError} If credentials are invalid
   */
  async login(email: string, password: string): Promise<LoginResult> {
    if (this.getAuthType() === 'api_key') {
      throw new Error(
        'Cannot call login() on an API-key-authenticated client. Use session-based auth instead.'
      );
    }

    // Create a temporary HTTP client with the provided credentials to perform
    // the login call against the ops API (authBaseUrl).
    const tempHttp = new RegistryHttpClient({
      authBaseUrl: this.http.getAuthBaseUrl(),
      timeout: this.configTimeout,
      email,
      password,
    });
    const tempStrategy = tempHttp.getAuthStrategy();
    if (tempStrategy instanceof JwtSessionAuth) {
      const token = await tempStrategy.login();
      const expiresAt = tempStrategy.getExpiresAt()?.toISOString();

      // Install session auth on the main client so subsequent requests
      // are authenticated (matches OpsClient.login() behaviour).
      // Password omitted — token is already obtained; no re-login needed.
      this.http.setAuthStrategy(
        new JwtSessionAuth(
          this.http.createFetchClient(),
          { email, password: '' },
          this.configOnTokenRefresh,
          token,
        )
      );

      return { sessionToken: token, expiresAt };
    }

    // Unreachable: the API-key guard above catches the only non-session path,
    // and the temp HTTP client always creates JwtSessionAuth when given email/password.
    // Retained as a defensive safety net.
    throw new Error('Cannot login: no session auth strategy available');
  }

  /**
   * Clear the local session token. Does not invalidate the token server-side —
   * the registry API has no server-side logout endpoint.
   *
   * No-ops silently if the client is not using session-based auth.
   */
  logout(): void {
    const authStrategy = this.http.getAuthStrategy();
    if (authStrategy instanceof JwtSessionAuth) {
      authStrategy.clearSession();
    }
  }

  private createHttpClient(config: RegistryClientConfig): RegistryHttpClient {
    return new RegistryHttpClient({
      baseUrl: config.baseUrl,
      authBaseUrl: config.authBaseUrl,
      timeout: config.timeout,
      retries: config.retries,
      debug: config.debug,
      apiKey: config.apiKey,
      email: config.email,
      password: config.password,
      sessionToken: config.sessionToken,
      orgSlug: config.orgSlug,
      onTokenRefresh: config.onTokenRefresh,
    });
  }

  private bindDefinitions(): RegistryClient['definitions'] {
    return {
      list: (query) => definitionsOps.list(this.http, query),
      get: (type, name, version, options) => definitionsOps.get(this.http, type, name, version, options),
      create: (type, name, body) => definitionsOps.create(this.http, type, name, body),
      update: (type, name, version, body) => definitionsOps.update(this.http, type, name, version, body),
      delete: (type, name, version) => definitionsOps.remove(this.http, type, name, version),
      publish: (type, name, version) => definitionsOps.publish(this.http, type, name, version),
      deprecate: (type, name, version, body) => definitionsOps.deprecate(this.http, type, name, version, body),
      /**
       * Archive a deprecated definition.
       * This is a terminal state that removes the definition from discovery.
       */
      archive: (type, name, version) => definitionsOps.archive(this.http, type, name, version),
    };
  }

  private bindVersions(): RegistryClient['versions'] {
    return {
      list: (type, name, options) => versionsOps.list(this.http, type, name, options),
      // SAFETY: versionsOps.diff has matching overloads — the implementation signature
      // returns the union, but callers see the narrowed overload signatures from the
      // RegistryClient['versions']['diff'] type.
      diff: ((type: DefinitionType, name: string, from: string, to: string, options?: { full?: boolean; format?: 'sections' | 'fields' | 'unified' }) =>
        versionsOps.diff(this.http, type, name, from, to, options)) as RegistryClient['versions']['diff'],
    };
  }

  private bindValidation(): RegistryClient['validation'] {
    return {
      validate: (type, yaml) => validationOps.validate(this.http, type, yaml),
    };
  }

  private bindDependencies(): RegistryClient['dependencies'] {
    return {
      get: (type, name, version, options) => dependenciesOps.get(this.http, type, name, version, options),
      getDependents: (type, name, version) => dependenciesOps.getDependents(this.http, type, name, version),
    };
  }

  private bindForks(): RegistryClient['forks'] {
    return {
      create: (type, name, version, body) => forksOps.create(this.http, type, name, version, body),
      isForkable: (type, name, version, options) => forksOps.isForkable(this.http, type, name, version, options),
      getAncestry: (type, name, version) => forksOps.getAncestry(this.http, type, name, version),
      list: (type, name, version) => forksOps.list(this.http, type, name, version),
    };
  }

  private bindExecutions(): RegistryClient['executions'] {
    return {
      record: (type, name, version, body) => executionsOps.record(this.http, type, name, version, body),
      getStats: (type, name, version, window) => executionsOps.getStats(this.http, type, name, version, window),
    };
  }

  private bindStars(): RegistryClient['stars'] {
    return {
      getStatus: (type, name, version) => starsOps.getStatus(this.http, type, name, version),
      star: (type, name, version) => starsOps.star(this.http, type, name, version),
      unstar: (type, name, version) => starsOps.unstar(this.http, type, name, version),
    };
  }

  private bindTranslation(): RegistryClient['translation'] {
    return {
      getVersion: () => translationOps.getVersion(this.http),
      retranslate: (type, name, version, options) => translationOps.retranslate(this.http, type, name, version, options),
      upgradeDefinition: (type, name, body) => translationOps.upgradeDefinition(this.http, type, name, body),
    };
  }

  private bindModels(): RegistryClient['models'] {
    return {
      list: (query) => modelsOps.list(this.http, query),
      get: (provider, modelId) => modelsOps.get(this.http, provider, modelId),
      listProviders: () => modelsOps.listProviders(this.http),
      listAliases: () => modelsOps.listAliases(this.http),
      resolveAlias: (alias) => modelsOps.resolveAlias(this.http, alias),
      sync: () => modelsOps.sync(this.http),
    };
  }

  private bindUsers(): RegistryClient['users'] {
    return {
      get: (id) => usersOps.get(this.http, id),
      batch: (ids) => usersOps.batch(this.http, ids),
    };
  }

  private bindRender(): RegistryClient['render'] {
    return {
      get: (type, name, version, options?) => renderOps.get(this.http, type, name, version, options),
      preview: (type, body) => renderOps.preview(this.http, type, body),
    };
  }

  private bindAnalytics(): RegistryClient['analytics'] {
    return {
      getEffectiveness: (type, name, version) => analyticsOps.getEffectiveness(this.http, type, name, version),
      getHealth: (type, name, version) => analyticsOps.getHealth(this.http, type, name, version),
      getEcosystemOverview: () => analyticsOps.getEcosystemOverview(this.http),
      getLineage: (type, name) => analyticsOps.getLineage(this.http, type, name),
      getEvolution: (type, name) => analyticsOps.getEvolution(this.http, type, name),
      getTranslation: (type, name) => analyticsOps.getTranslation(this.http, type, name),
      compare: (type, name, versions) => analyticsOps.compare(this.http, type, name, versions),
      getDiffImpact: (type, name, fromVersion, toVersion) => analyticsOps.getDiffImpact(this.http, type, name, fromVersion, toVersion),
    };
  }

  /**
   * Get the underlying HTTP client for advanced use cases such as
   * making requests to custom endpoints not covered by the operation namespaces.
   *
   * @returns The {@link RegistryHttpClient} instance used by this client
   * @example
   * ```typescript
   * const http = client.getHttpClient();
   * const data = await http.get<MyType>('/custom/endpoint');
   * ```
   */
  getHttpClient(): RegistryHttpClient {
    return this.http;
  }

  /**
   * Check if the client is authenticated
   * @returns true if credentials are configured, false otherwise
   */
  isAuthenticated(): boolean {
    const strategy = this.http.getAuthStrategy();
    return strategy !== null && strategy.isAuthenticated();
  }

  /**
   * Get the authentication type being used
   * @returns 'api_key', 'session', or null if not authenticated
   */
  getAuthType(): 'api_key' | 'session' | null {
    const strategy = this.http.getAuthStrategy();
    return strategy ? strategy.getType() : null;
  }
}
