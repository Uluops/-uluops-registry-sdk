/**
 * Definition normalization — transforms UDL YAML authoring format
 * into the runtime shape that executors expect.
 *
 * @example
 * ```typescript
 * import { normalizeDefinition } from '@uluops/registry-sdk/normalization';
 *
 * const { topKey, definition } = normalizeDefinition(parsedYaml);
 * ```
 *
 * @packageDocumentation
 */

// Primary API
export { normalizeDefinition } from './normalize-definition.js';

// Individual normalizers (for advanced consumers who know the type)
export { normalizeCommandSection } from './normalize-command.js';
export { normalizeWorkflowSection } from './normalize-workflow.js';
export { normalizePipelineSection } from './normalize-pipeline.js';

// Structural validators
export { validateWorkflowStructure, validatePipelineStructure } from './validate-structure.js';

// Types and error
export type { DefinitionTopKey, NormalizeResult } from './types.js';
export { DefinitionValidationError } from './types.js';
