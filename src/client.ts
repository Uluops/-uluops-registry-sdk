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
import { loadConfig } from './config/loaders.js';
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

import type {
  Definition,
  ListDefinitionsQuery,
  GetDefinitionOptions,
  CreateDefinitionBody,
  UpdateDefinitionBody,
  DeprecateDefinitionBody,
} from './types/definitions.js';
import type { VersionListItem, VersionDiff } from './types/versions.js';
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
  ValidationResult,
  RenderResult,
  RenderPreviewBody,
  RecordExecutionBody,
  RecordExecutionResult,
  ExecutionStats,
  TranslatorVersion,
  RetranslateOptions,
  UpgradeDefinitionBody,
  UpgradeResult,
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
  /** Base URL for the registry API */
  baseUrl?: string;
  /** Base URL for the ops API (login/refresh) — defaults to localhost:3100 */
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

  /**
   * Definition operations (CRUD, publish, deprecate)
   */
  readonly definitions: {
    list: (query?: ListDefinitionsQuery) => Promise<DefinitionListResponse>;
    get: (type: DefinitionType, name: string, version?: string, options?: GetDefinitionOptions) => Promise<Definition>;
    create: (type: DefinitionType, name: string, body: CreateDefinitionBody) => Promise<Definition>;
    update: (type: DefinitionType, name: string, version: string, body: UpdateDefinitionBody) => Promise<Definition>;
    delete: (type: DefinitionType, name: string, version: string) => Promise<void>;
    publish: (type: DefinitionType, name: string, version: string) => Promise<Definition>;
    deprecate: (type: DefinitionType, name: string, version: string, body: DeprecateDefinitionBody) => Promise<Definition>;
  };

  /**
   * Version operations (list, diff)
   */
  readonly versions: {
    list: (type: DefinitionType, name: string) => Promise<VersionListItem[]>;
    diff: (type: DefinitionType, name: string, from: string, to: string) => Promise<VersionDiff>;
  };

  /**
   * Validation operations
   */
  readonly validation: {
    validate: (type: DefinitionType, yaml: string) => Promise<ValidationResult>;
  };

  /**
   * Dependency operations
   */
  readonly dependencies: {
    get: (type: DefinitionType, name: string, version: string, options?: GetDependenciesOptions) => Promise<DependencyGraph>;
    getDependents: (type: DefinitionType, name: string, version: string) => Promise<DependencyGraph>;
  };

  /**
   * Fork operations
   */
  readonly forks: {
    create: (type: DefinitionType, name: string, version: string, body: ForkDefinitionBody) => Promise<ForkResponse>;
    checkForkable: (type: DefinitionType, name: string, version: string, options?: CheckForkableOptions) => Promise<ForkableCheck>;
    getLineage: (type: DefinitionType, name: string, version: string) => Promise<ForkLineage>;
    list: (type: DefinitionType, name: string, version: string) => Promise<ForkListResponse>;
  };

  /**
   * Execution statistics operations
   */
  readonly executions: {
    record: (type: DefinitionType, name: string, version: string, body: RecordExecutionBody) => Promise<RecordExecutionResult>;
    getStats: (type: DefinitionType, name: string, version: string, window?: number) => Promise<ExecutionStats>;
  };

  /**
   * Translation operations
   */
  readonly translation: {
    getVersion: () => Promise<TranslatorVersion>;
    retranslate: (type: DefinitionType, name: string, version: string, options?: RetranslateOptions) => Promise<Definition>;
    upgrade: (type: DefinitionType, name: string, body: UpgradeDefinitionBody) => Promise<UpgradeResult>;
  };

  /**
   * Model catalog operations
   */
  readonly models: {
    list: (query?: ListModelsQuery) => Promise<ModelsListResponse>;
    get: (provider: string, modelId: string) => Promise<Model>;
    listProviders: () => Promise<ProvidersListResponse>;
    listAliases: () => Promise<AliasesListResponse>;
    resolveAlias: (alias: string) => Promise<AliasResolution>;
    sync: () => Promise<ModelSyncResult>;
  };

  /**
   * User operations (read-only)
   */
  readonly users: {
    get: (id: string) => Promise<PublicUser>;
    batch: (ids: string[]) => Promise<BatchUserResponse>;
  };

  /**
   * Render operations
   */
  readonly render: {
    get: (type: DefinitionType, name: string, version: string) => Promise<RenderResult>;
    preview: (type: DefinitionType, body: RenderPreviewBody) => Promise<RenderResult>;
  };

  constructor(config: RegistryClientConfig = {}) {
    this.http = this.createHttpClient(config);
    this.definitions = this.bindDefinitions();
    this.versions = this.bindVersions();
    this.validation = this.bindValidation();
    this.dependencies = this.bindDependencies();
    this.forks = this.bindForks();
    this.executions = this.bindExecutions();
    this.translation = this.bindTranslation();
    this.models = this.bindModels();
    this.users = this.bindUsers();
    this.render = this.bindRender();
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Login with email and password via the ops-uluops-api.
   * The registry API has no auth endpoints — login is delegated to the ops API.
   */
  async login(email: string, password: string): Promise<{ sessionToken: string; expiresAt?: string }> {
    // Always use the provided email/password — create a temporary HTTP client
    // so the caller's explicit credentials are never silently ignored.
    const { RegistryHttpClient: HttpClient } = await import('./http/http-client.js');
    const tempHttp = new HttpClient({
      authBaseUrl: (this.http as RegistryHttpClient & { authBaseUrl?: string })['authBaseUrl'],
      email,
      password,
    });
    const tempStrategy = tempHttp.getAuthStrategy();
    if (tempStrategy instanceof JwtSessionAuth) {
      const token = await tempStrategy.login();
      return { sessionToken: token, expiresAt: tempStrategy.getExpiresAt()?.toISOString() };
    }

    throw new Error('Cannot login: no session auth strategy available');
  }

  /**
   * Logout (clear local session — registry has no server-side logout endpoint)
   */
  logout(): void {
    const authStrategy = this.http.getAuthStrategy();
    if (authStrategy instanceof JwtSessionAuth) {
      authStrategy.clearSession();
    }
  }

  private createHttpClient(config: RegistryClientConfig): RegistryHttpClient {
    const sdkConfig = loadConfig({
      apiKey: config.apiKey,
      email: config.email,
      password: config.password,
      sessionToken: config.sessionToken,
      baseUrl: config.baseUrl,
      authBaseUrl: config.authBaseUrl,
      debug: config.debug,
      timeout: config.timeout,
      retries: config.retries,
    });

    return new RegistryHttpClient({
      baseUrl: sdkConfig.baseUrl,
      authBaseUrl: sdkConfig.authBaseUrl,
      timeout: sdkConfig.timeout,
      retries: sdkConfig.retries,
      debug: sdkConfig.debug,
      apiKey: sdkConfig.credentials.apiKey,
      email: sdkConfig.credentials.email,
      password: sdkConfig.credentials.password,
      sessionToken: sdkConfig.credentials.sessionToken,
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
    };
  }

  private bindVersions(): RegistryClient['versions'] {
    return {
      list: (type, name) => versionsOps.list(this.http, type, name),
      diff: (type, name, from, to) => versionsOps.diff(this.http, type, name, from, to),
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
      checkForkable: (type, name, version, options) => forksOps.checkForkable(this.http, type, name, version, options),
      getLineage: (type, name, version) => forksOps.getLineage(this.http, type, name, version),
      list: (type, name, version) => forksOps.list(this.http, type, name, version),
    };
  }

  private bindExecutions(): RegistryClient['executions'] {
    return {
      record: (type, name, version, body) => executionsOps.record(this.http, type, name, version, body),
      getStats: (type, name, version, window) => executionsOps.getStats(this.http, type, name, version, window),
    };
  }

  private bindTranslation(): RegistryClient['translation'] {
    return {
      getVersion: () => translationOps.getVersion(this.http),
      retranslate: (type, name, version, options) => translationOps.retranslate(this.http, type, name, version, options),
      upgrade: (type, name, body) => translationOps.upgrade(this.http, type, name, body),
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
      get: (type, name, version) => renderOps.get(this.http, type, name, version),
      preview: (type, body) => renderOps.preview(this.http, type, body),
    };
  }

  /**
   * Get the underlying HTTP client (for advanced use cases)
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
