/**
 * Render operations for the Registry SDK
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type { RenderResult, RenderPreviewBody, RenderProfile } from '../types/responses.js';
import type { DefinitionType } from '../types/enums.js';
import { buildDefinitionPath, validateDefinitionType, validateYamlSize } from '../config/validators.js';

/** Options for getting rendered markdown. */
export interface RenderGetOptions {
  renderProfile?: RenderProfile;
}

/**
 * Get the rendered markdown for a definition
 */
export async function get(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
  options?: RenderGetOptions,
): Promise<RenderResult> {
  const path = `${buildDefinitionPath(type, name, version)}/render`;
  const params = options?.renderProfile ? { renderProfile: options.renderProfile } : undefined;
  return http.get<RenderResult>(path, params);
}

/**
 * Preview render YAML without storing
 */
export async function preview(
  http: RegistryHttpClient,
  type: DefinitionType,
  body: RenderPreviewBody
): Promise<RenderResult> {
  validateDefinitionType(type);
  validateYamlSize(body.yaml);
  return http.post<RenderResult>(`/render/${type}/preview`, body);
}
