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

/**
 * Get the current translator version
 */
export async function getVersion(http: RegistryHttpClient): Promise<TranslatorVersion> {
  return http.get<TranslatorVersion>('/definitions/translation/version');
}

/**
 * Retranslate a definition using the latest translator
 * @param options.createNewVersion If true, creates a new patch version instead of updating in-place
 */
export async function retranslate(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
  options?: RetranslateOptions
): Promise<Definition> {
  const path = `${buildDefinitionPath(type, name, version)}/retranslate`;
  return http.post<Definition>(path, options);
}

/**
 * Upgrade a legacy definition to the dual-storage format
 */
export async function upgrade(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  body: UpgradeDefinitionBody
): Promise<UpgradeResult> {
  validateYamlSize(body.yaml);
  const path = `/definitions/${type}/${name}/upgrade`;
  return http.post<UpgradeResult>(path, body);
}
