/**
 * Render operations for the Registry SDK
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type { RenderResult, RenderPreviewBody, RenderProfile } from '../types/responses.js';
import type { DefinitionType } from '../types/enums.js';
import { buildDefinitionPath, validateDefinitionType, validateYamlSize, validateShortString } from '../config/validators.js';
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
 * Get the rendered markdown for a definition.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version (or 'latest')
 * @param options - Render options (renderProfile, target harness, model override)
 * @returns Rendered markdown content with metadata
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
  if (options?.target) {
    validateShortString(options.target, 'target');
    params.target = options.target;
  }
  if (options?.model) {
    validateShortString(options.model, 'model');
    params.model = options.model;
  }
  return http.get<RenderResult>(path, Object.keys(params).length > 0 ? params : undefined, { schema: renderResultSchema });
}

/**
 * Preview render YAML without storing.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param body - Preview payload with raw YAML
 * @returns Rendered markdown content
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
