/**
 * Model catalog operations for the Registry SDK
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type {
  Model,
  ModelAlias,
  AliasResolution,
  Provider,
  ListModelsQuery,
  ModelSyncResult,
} from '../types/models.js';
import { ValidationError } from '../errors/errors.js';
import {
  modelsListResponseSchema,
  modelSchema,
  providersListResponseSchema,
  aliasesListResponseSchema,
  aliasResolutionSchema,
  modelSyncResultSchema,
} from '../types/response-schemas.js';

/**
 * Models list response
 */
export interface ModelsListResponse {
  models: Model[];
  aliases: ModelAlias[];
  total: number;
}

/**
 * Providers list response
 */
export interface ProvidersListResponse {
  providers: Provider[];
  total: number;
}

/**
 * Aliases list response
 */
export interface AliasesListResponse {
  aliases: ModelAlias[];
  total: number;
}

/**
 * List models with optional filters
 */
export async function list(
  http: RegistryHttpClient,
  query?: ListModelsQuery
): Promise<ModelsListResponse> {
  return http.get<ModelsListResponse>('/models', query, { schema: modelsListResponseSchema });
}

/**
 * Get a specific model by provider and model ID
 */
export async function get(
  http: RegistryHttpClient,
  provider: string,
  modelId: string
): Promise<Model> {
  if (!provider || typeof provider !== 'string') {
    throw new ValidationError('Provider is required', { field: 'provider' });
  }
  if (!modelId || typeof modelId !== 'string') {
    throw new ValidationError('Model ID is required', { field: 'modelId' });
  }
  return http.get<Model>(`/models/${encodeURIComponent(provider)}/${encodeURIComponent(modelId)}`, undefined, { schema: modelSchema });
}

/**
 * List all providers
 */
export async function listProviders(http: RegistryHttpClient): Promise<ProvidersListResponse> {
  return http.get<ProvidersListResponse>('/models/providers', undefined, { schema: providersListResponseSchema });
}

/**
 * List all model aliases
 */
export async function listAliases(http: RegistryHttpClient): Promise<AliasesListResponse> {
  return http.get<AliasesListResponse>('/models/aliases', undefined, { schema: aliasesListResponseSchema });
}

/**
 * Resolve a model alias to its target model
 */
export async function resolveAlias(
  http: RegistryHttpClient,
  alias: string
): Promise<AliasResolution> {
  if (!alias || typeof alias !== 'string') {
    throw new ValidationError('Alias is required', { field: 'alias' });
  }
  return http.get<AliasResolution>(`/models/resolve/${encodeURIComponent(alias)}`, undefined, { schema: aliasResolutionSchema });
}

/**
 * Sync models from models.dev
 * Requires admin role or pro subscription
 */
export async function sync(http: RegistryHttpClient): Promise<ModelSyncResult> {
  return http.post<ModelSyncResult>('/models/sync', undefined, { schema: modelSyncResultSchema });
}
