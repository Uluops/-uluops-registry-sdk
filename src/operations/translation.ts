/**
 * Translation operations for the Registry SDK
 */

import { z } from 'zod';
import type { RegistryHttpClient } from '../http/http-client.js';
import type {
  TranslatorVersion,
  RetranslateOptions,
  UpgradeDefinitionBody,
  UpgradeResult,
} from '../types/responses.js';
import type { DefinitionType } from '../types/enums.js';
import { buildDefinitionPath, validateYamlSize } from '../config/validators.js';
import { translatorVersionSchema, upgradeResultSchema, retranslateResultSchema } from '../types/response-schemas.js';
import { parseResponse } from '../http/parse-response.js';

/** Narrow retranslate response — see retranslateResultSchema for docs. */
export type RetranslateResult = z.infer<typeof retranslateResultSchema>;

/**
 * Get the current translator version.
 *
 * @param http - Registry HTTP client
 * @returns Translator version info (version string, supported schemas)
 */
export async function getVersion(http: RegistryHttpClient): Promise<TranslatorVersion> {
  return parseResponse(translatorVersionSchema, await http.get<TranslatorVersion>('/definitions/translation/version', undefined), 'translation.getVersion');
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
): Promise<RetranslateResult> {
  const path = `${buildDefinitionPath(type, name, version)}/retranslate`;
  return parseResponse(retranslateResultSchema, await http.post<unknown>(path, options), 'translation.retranslate');
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
  return parseResponse(upgradeResultSchema, await http.post<UpgradeResult>(path, body), 'translation.upgradeDefinition');
}
