/**
 * Translation operations for the Registry SDK
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type {
  TranslatorVersion,
  RetranslateOptions,
  UpgradeDefinitionBody,
  UpgradeResult,
} from '../types/responses.js';
import type { Definition } from '../types/definitions.js';
import type { DefinitionType } from '../types/enums.js';
import { buildDefinitionPath, validateYamlSize } from '../config/validators.js';
import { definitionSchema } from '../types/schemas.js';
import { translatorVersionSchema, upgradeResultSchema } from '../types/response-schemas.js';

/**
 * Get the current translator version.
 *
 * @param http - Registry HTTP client
 * @returns Translator version info (version string, supported schemas)
 */
export async function getVersion(http: RegistryHttpClient): Promise<TranslatorVersion> {
  return http.get<TranslatorVersion>('/definitions/translation/version', undefined, { schema: translatorVersionSchema });
}

/**
 * Retranslate a definition using the latest translator.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version to retranslate
 * @param options - Options (createNewVersion: create a new patch version instead of updating in-place)
 * @returns The retranslated definition
 */
export async function retranslate(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
  options?: RetranslateOptions
): Promise<Definition> {
  const path = `${buildDefinitionPath(type, name, version)}/retranslate`;
  return http.post<Definition>(path, options, { schema: definitionSchema });
}

/**
 * Upgrade a legacy definition to the dual-storage format.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param body - Upgrade payload with YAML content
 * @returns Upgrade result with the new version
 */
export async function upgradeDefinition(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  body: UpgradeDefinitionBody
): Promise<UpgradeResult> {
  validateYamlSize(body.yaml);
  const path = `${buildDefinitionPath(type, name)}/upgrade`;
  return http.post<UpgradeResult>(path, body, { schema: upgradeResultSchema });
}
