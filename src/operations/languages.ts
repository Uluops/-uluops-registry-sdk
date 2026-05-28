/**
 * Language operations for the Registry SDK
 *
 * Definition languages (ADL, CDL, WDL, PDL) and their current JSON schemas.
 * Read-only — languages and schemas are managed by the definition-factory package.
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type { Language, LanguageWithSchema } from '../types/languages.js';
import { ValidationError } from '../errors/errors.js';
import {
  languagesListResponseSchema,
  languageWithSchemaSchema,
} from '../types/response-schemas.js';

/**
 * Languages list response.
 */
export interface LanguagesListResponse {
  languages: Language[];
  total: number;
}

/**
 * List all definition languages.
 *
 * @param http - Registry HTTP client
 * @returns Languages list with total count
 */
export async function list(
  http: RegistryHttpClient,
): Promise<LanguagesListResponse> {
  return http.get<LanguagesListResponse>('/languages', undefined, {
    schema: languagesListResponseSchema,
  });
}

/**
 * Get a definition language with its current JSON Schema.
 *
 * @param http - Registry HTTP client
 * @param id - Language ID (adl, cdl, wdl, pdl)
 * @returns Language with embedded schema
 * @throws {ValidationError} If id is empty
 */
export async function get(
  http: RegistryHttpClient,
  id: string,
): Promise<LanguageWithSchema> {
  if (!id || typeof id !== 'string') {
    throw new ValidationError('Language ID is required', { field: 'id' });
  }
  return http.get<LanguageWithSchema>(`/languages/${encodeURIComponent(id)}`, undefined, {
    schema: languageWithSchemaSchema,
  });
}
