/**
 * Language types for the Registry SDK
 *
 * Definition languages (ADL, CDL, WDL, PDL) and their JSON schemas.
 */

/**
 * Embedded JSON Schema metadata returned with a language.
 */
export interface LanguageSchema {
  version: string;
  title: string;
  schemaUrl: string;
  content: Record<string, unknown>;
}

/**
 * Definition language summary (returned in list responses).
 */
export interface Language {
  id: string;
  displayName: string;
  abbreviation: string;
  description: string;
  definitionType: string;
  currentVersion: string;
  status: string;
}

/**
 * Definition language with its current JSON Schema (returned by get).
 */
export interface LanguageWithSchema extends Language {
  schema: LanguageSchema;
}
