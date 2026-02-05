/**
 * Validation operations for the Registry SDK
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type { ValidationResult } from '../types/responses.js';
import type { DefinitionType } from '../types/enums.js';
import { validateDefinitionType, validateYamlSize } from '../config/validators.js';

/**
 * Validate YAML content without storing
 */
export async function validate(
  http: RegistryHttpClient,
  type: DefinitionType,
  yaml: string
): Promise<ValidationResult> {
  validateDefinitionType(type);
  validateYamlSize(yaml);

  return http.post<ValidationResult>(`/validate/${type}`, { yaml });
}
