/**
 * Definition normalization orchestrator.
 *
 * Detects the top-level definition key, dispatches to the appropriate
 * type-specific normalizer, and runs structural validation where needed.
 *
 * This is the primary public API for definition normalization.
 *
 * @example
 * ```typescript
 * import { normalizeDefinition } from '@uluops/registry-sdk/normalization';
 * import yaml from 'yaml';
 *
 * const parsed = yaml.parse(yamlContent);
 * const { topKey, definition } = normalizeDefinition(parsed);
 * // definition is now in runtime-ready shape
 * ```
 */

import type { DefinitionTopKey, NormalizeResult } from './types.js';
import { DefinitionValidationError } from './types.js';
import { normalizeCommandSection } from './normalize-command.js';
import { normalizeWorkflowSection } from './normalize-workflow.js';
import { normalizePipelineSection } from './normalize-pipeline.js';
import { validateWorkflowStructure, validatePipelineStructure } from './validate-structure.js';

const KNOWN_TOP_KEYS: readonly DefinitionTopKey[] = ['agent', 'command', 'workflow', 'pipeline'];

/**
 * Normalize a parsed definition YAML object into runtime-ready shape.
 *
 * Detects whether the definition is an agent, command, workflow, or pipeline
 * from its top-level key, then applies the appropriate normalizer to transform
 * the authoring-friendly UDL format into the shape executors expect.
 *
 * Returns a new object — the input is never mutated.
 *
 * @param parsed - A parsed YAML object with a top-level `agent`, `command`, `workflow`, or `pipeline` key
 * @returns The detected top key and the normalized definition
 * @throws {DefinitionValidationError} if no known top-level key found or section is invalid
 */
export function normalizeDefinition(parsed: Record<string, unknown>): NormalizeResult {
  const topKey = KNOWN_TOP_KEYS.find(k => k in parsed);
  if (!topKey) {
    throw new DefinitionValidationError(
      `Invalid definition: expected a top-level key of ${KNOWN_TOP_KEYS.join(', ')}, ` +
      `found: ${Object.keys(parsed).join(', ')}`,
    );
  }

  const section = parsed[topKey];
  if (typeof section !== 'object' || section === null) {
    throw new DefinitionValidationError(
      `Invalid definition: "${topKey}" must be an object`,
    );
  }

  // Clone the full definition, then replace the relevant section with its normalized form
  const definition = structuredClone(parsed);

  if (topKey === 'command') {
    definition[topKey] = normalizeCommandSection(section as Record<string, unknown>);
  }

  if (topKey === 'workflow') {
    const normalized = normalizeWorkflowSection(section as Record<string, unknown>);
    validateWorkflowStructure(normalized);
    definition[topKey] = normalized;
  }

  if (topKey === 'pipeline') {
    const normalized = normalizePipelineSection(section as Record<string, unknown>);
    validatePipelineStructure(normalized);
    definition[topKey] = normalized;
  }

  // Agent definitions pass through unchanged — no normalization needed

  return { topKey, definition };
}
