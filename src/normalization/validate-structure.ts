/**
 * Structural guards for workflow and pipeline definitions.
 *
 * These catch malformed YAML that would crash executors at runtime.
 * Full schema validation happens registry-side at publish time — these
 * are lightweight guards against completely wrong files.
 */

import { DefinitionValidationError } from './types.js';

/**
 * Verify a workflow section has the required nested structure.
 * WorkflowExecutor accesses `orchestration.phases` directly —
 * a missing or malformed field would crash at runtime.
 *
 * @throws {DefinitionValidationError} if orchestration or phases missing/invalid
 */
export function validateWorkflowStructure(section: Record<string, unknown>): void {
  const orchestration = section['orchestration'] as Record<string, unknown> | undefined;
  if (!orchestration || typeof orchestration !== 'object') {
    throw new DefinitionValidationError(
      'Invalid workflow definition: missing "orchestration" section',
    );
  }
  if (!Array.isArray(orchestration['phases'])) {
    throw new DefinitionValidationError(
      'Invalid workflow definition: "orchestration.phases" must be an array',
    );
  }
}

/**
 * Verify a pipeline section has the required stages array.
 * PipelineExecutor iterates `stages` directly — a missing field
 * would crash at runtime.
 *
 * @throws {DefinitionValidationError} if stages missing/invalid
 */
export function validatePipelineStructure(section: Record<string, unknown>): void {
  if (!Array.isArray(section['stages'])) {
    throw new DefinitionValidationError(
      'Invalid pipeline definition: "stages" must be an array',
    );
  }
}
