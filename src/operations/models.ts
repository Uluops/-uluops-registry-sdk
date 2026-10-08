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
} from '../types/models.js';
import { ValidationError } from '../errors/errors.js';
import {
  modelsListResponseSchema,
  modelSchema,
  providersListResponseSchema,
  aliasesListResponseSchema,
  aliasResolutionSchema,
} from '../types/response-schemas.js';
import { parseResponse } from '../http/parse-response.js';

/**
 * Fill `reasoning` and its deprecated alias `extendedThinking` from each other.
 *
 * The registry serves `reasoning`; consumers written before 0.61.0 read `extendedThinking`. Applied
 * after parsing on every model this SDK returns (get, list items, alias resolution), and exported so
 * callers parsing with the public `modelSchema` themselves can do the same. An explicit value is
 * never overwritten, and a capability absent under both names stays absent (unknown, not false).
 */
export function normalizeCapabilities<T extends { reasoning?: boolean; extendedThinking?: boolean }>(caps: T): T {
  const reasoning = caps.reasoning ?? caps.extendedThinking;
  const extendedThinking = caps.extendedThinking ?? caps.reasoning;
  return {
    ...caps,
    ...(reasoning !== undefined ? { reasoning } : {}),
    ...(extendedThinking !== undefined ? { extendedThinking } : {}),
  };
}

function normalizeModel<M extends { capabilities: { reasoning?: boolean; extendedThinking?: boolean } }>(model: M): M {
  return { ...model, capabilities: normalizeCapabilities(model.capabilities) };
}

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
 * List models with optional filters.
 *
 * @param http - Registry HTTP client
 * @param query - Optional filters (provider, capability, search)
 * @returns Models list with aliases and total count
 */
export async function list(
  http: RegistryHttpClient,
  query?: ListModelsQuery
): Promise<ModelsListResponse> {
  const parsed = parseResponse(modelsListResponseSchema, await http.get<ModelsListResponse>('/models', query), 'models.list');
  return { ...parsed, models: parsed.models.map(normalizeModel) };
}

/**
 * Get a specific model by provider and model ID.
 *
 * @param http - Registry HTTP client
 * @param provider - Provider name (e.g., 'anthropic', 'openai')
 * @param modelId - Model identifier (e.g., 'claude-sonnet-4-5-20250514')
 * @returns Model details including capabilities and pricing
 * @throws {ValidationError} If provider or modelId is empty or not a string
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
  // An id containing '/' (every OpenRouter slug, e.g. 'anthropic/claude-sonnet-4') cannot travel in
  // the path: the registry's edge decodes %2F before routing, so the request arrives as three segments
  // and answers a route 404 (`details.reason: 'route'`). Such ids use the query-string lookup. Ids
  // without '/' keep the path form, so existing callers and older registry deployments see no change.
  const response = modelId.includes('/')
    ? await http.get<Model>('/models/lookup', { provider, modelId })
    : await http.get<Model>(`/models/${encodeURIComponent(provider)}/${encodeURIComponent(modelId)}`, undefined);
  return normalizeModel(parseResponse(modelSchema, response, 'models.get'));
}

/**
 * List all providers.
 *
 * @param http - Registry HTTP client
 * @returns Provider list with total count
 */
export async function listProviders(
  http: RegistryHttpClient,
  options?: { limit?: number; offset?: number },
): Promise<ProvidersListResponse> {
  // RG9: the catalog holds ~197 providers — an unpaginated default exceeded a
  // single MCP response. limit default 50 (max 200) server-side; total is the
  // whole catalog so callers can page.
  const params: Record<string, string> = {};
  if (options?.limit !== undefined) params['limit'] = String(options.limit);
  if (options?.offset !== undefined) params['offset'] = String(options.offset);
  return parseResponse(
    providersListResponseSchema,
    await http.get<ProvidersListResponse>('/models/providers', Object.keys(params).length ? params : undefined),
    'models.listProviders',
  );
}

/**
 * List all model aliases.
 *
 * @param http - Registry HTTP client
 * @returns Alias list with total count
 */
export async function listAliases(http: RegistryHttpClient): Promise<AliasesListResponse> {
  return parseResponse(aliasesListResponseSchema, await http.get<AliasesListResponse>('/models/aliases', undefined), 'models.listAliases');
}

/**
 * Resolve a model alias to its target model.
 *
 * @param http - Registry HTTP client
 * @param alias - Alias string to resolve (e.g., 'sonnet', 'opus')
 * @returns Resolution result with target provider and model ID
 * @throws {ValidationError} If alias is empty or not a string
 */
export async function resolveAlias(
  http: RegistryHttpClient,
  alias: string
): Promise<AliasResolution> {
  if (!alias || typeof alias !== 'string') {
    throw new ValidationError('Alias is required', { field: 'alias' });
  }
  // Same edge constraint as `get`: an alias containing '/' (e.g. '~anthropic/claude-fable-latest')
  // uses the query-string form.
  const response = alias.includes('/')
    ? await http.get<AliasResolution>('/models/resolve', { alias })
    : await http.get<AliasResolution>(`/models/resolve/${encodeURIComponent(alias)}`, undefined);
  const parsed = parseResponse(aliasResolutionSchema, response, 'models.resolveAlias');
  return parsed.model ? { ...parsed, model: normalizeModel(parsed.model) } : parsed;
}
