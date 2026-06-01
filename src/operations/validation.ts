/**
 * Validation operations for the Registry SDK
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type { ValidationResult } from '../types/responses.js';
import type { DefinitionType } from '../types/enums.js';
import { validateDefinitionType, validateYamlSize } from '../config/validators.js';
import { validationResultSchema } from '../types/response-schemas.js';

/**
 * Validate YAML content without storing.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param yaml - Raw YAML string to validate
 * @returns Validation result with errors/warnings if any
 */
export async function validate(
  http: RegistryHttpClient,
  type: DefinitionType,
  yaml: string
): Promise<ValidationResult> {
  validateDefinitionType(type);
  validateYamlSize(yaml);

  return validationResultSchema.parse(await http.post<ValidationResult>(`/validate/${type}`, { yaml }));
}
