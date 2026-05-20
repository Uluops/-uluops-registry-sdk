/**
 * Lightweight types describing the shape of definition sections AFTER normalization.
 *
 * These types document what the normalizers produce without importing
 * @uluops/core's full execution-layer types. Consumers can assert
 * compatibility between these and their own runtime types.
 */

/** Top-level definition key — the root key that discriminates definition type. */
export type DefinitionTopKey = 'agent' | 'command' | 'workflow' | 'pipeline';

/**
 * Result of normalizeDefinition().
 *
 * Contains the detected top key and the full definition object with
 * the appropriate section normalized in place.
 */
export interface NormalizeResult {
  /** Which top-level key was detected (agent, command, workflow, pipeline). */
  topKey: DefinitionTopKey;
  /** The full definition object with the relevant section normalized. */
  definition: Record<string, unknown>;
}

/**
 * Error thrown when a parsed definition fails structural validation.
 *
 * Distinct from SDK's HTTP-oriented ValidationError — this is for
 * local structural checks on parsed YAML objects, not API responses.
 */
export class DefinitionValidationError extends Error {
  readonly code = 'DEFINITION_VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'DefinitionValidationError';
  }
}
