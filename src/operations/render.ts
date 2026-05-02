/**
 * Render operations for the Registry SDK
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type { RenderResult, RenderPreviewBody, RenderProfile } from '../types/responses.js';
import type { DefinitionType } from '../types/enums.js';
import { buildDefinitionPath, validateDefinitionType, validateYamlSize } from '../config/validators.js';
import { renderResultSchema } from '../types/response-schemas.js';

/** Options for getting rendered markdown. */
export interface RenderGetOptions {
  renderProfile?: RenderProfile;
  /** Target harness format (e.g., 'opencode', 'codex', 'gemini'). Omit for canonical Claude Code output. */
  target?: string;
  /** Model override for target envelope (e.g., 'gpt-5.3', 'gemini-3-preview'). */
  model?: string;
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
  const path = `${buildDefinitionPath(type, name, version, { allowLatest: true })}/render`;
  const params: Record<string, string> = {};
  if (options?.renderProfile) params.renderProfile = options.renderProfile;
  if (options?.target) params.target = options.target;
  if (options?.model) params.model = options.model;
  return http.get<RenderResult>(path, Object.keys(params).length > 0 ? params : undefined, { schema: renderResultSchema });
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
  return http.post<RenderResult>(`/render/${type}/preview`, body, { schema: renderResultSchema });
}
