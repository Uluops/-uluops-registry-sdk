/**
 * Input validation helpers for the Registry SDK
 */

import { DEFINITION_TYPES, type DefinitionType } from '../types/enums.js';
import { MAX_YAML_SIZE } from './constants.js';
import { ValidationError } from '../errors/errors.js';

const DEFINITION_TYPE_SET: Set<string> = new Set(DEFINITION_TYPES);

/**
 * Validate that a value is a valid definition type
 */
export function validateDefinitionType(type: string): asserts type is DefinitionType {
  if (!DEFINITION_TYPE_SET.has(type)) {
    throw new ValidationError(
      `Invalid definition type '${type}'. Must be one of: ${DEFINITION_TYPES.join(', ')}`,
      { field: 'type', value: type, allowed: [...DEFINITION_TYPES] }
    );
  }
}

/**
 * Validate definition name format
 * Must be lowercase letters, numbers, and hyphens
 * Cannot start or end with hyphen
 */
export function validateDefinitionName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('Definition name is required', { field: 'name', value: name });
  }

  if (name.length < 1 || name.length > 100) {
    throw new ValidationError('Definition name must be 1-100 characters', {
      field: 'name', value: name, length: name.length, maxLength: 100,
    });
  }

  const pattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
  if (!pattern.test(name)) {
    throw new ValidationError(
      'Definition name must be lowercase letters, numbers, and hyphens. ' +
        'Cannot start or end with hyphen.',
      { field: 'name', value: name }
    );
  }
}

/**
 * Validate version format (semver)
 */
export function validateVersion(version: string): void {
  if (!version || typeof version !== 'string') {
    throw new ValidationError('Version is required', { field: 'version' });
  }

  const pattern = /^\d+\.\d+\.\d+$/;
  if (!pattern.test(version)) {
    throw new ValidationError(
      `Invalid version '${version}'. Must be semver format (X.Y.Z)`,
      { field: 'version', value: version }
    );
  }
}

/**
 * Validate YAML content size
 */
export function validateYamlSize(yaml: string): void {
  const bytes = new TextEncoder().encode(yaml).byteLength;
  if (bytes > MAX_YAML_SIZE) {
    throw new ValidationError(
      `YAML content exceeds maximum size of ${MAX_YAML_SIZE / 1024}KB ` +
        `(${Math.round(bytes / 1024)}KB provided)`,
      { field: 'yaml', bytes, maxBytes: MAX_YAML_SIZE }
    );
  }
}

/**
 * Parse a definition reference string
 * Format: "name" or "name@version"
 */
export function parseDefinitionRef(ref: string): { name: string; version?: string } {
  if (!ref || typeof ref !== 'string') {
    throw new ValidationError('Definition reference is required', { field: 'ref' });
  }

  const parts = ref.split('@');
  if (parts.length > 2) {
    throw new ValidationError(
      `Invalid definition reference '${ref}'`,
      { field: 'ref', value: ref }
    );
  }

  const name = parts[0];
  const version = parts[1];

  if (!name) {
    throw new ValidationError('Definition name is required in reference', { field: 'ref', value: ref });
  }

  validateDefinitionName(name);
  if (version) {
    validateVersion(version);
  }

  return { name, version };
}

/**
 * Build a definition path from type, name, and optional version
 */
export function buildDefinitionPath(
  type: DefinitionType,
  name: string,
  version?: string
): string {
  validateDefinitionType(type);
  validateDefinitionName(name);
  if (version) {
    validateVersion(version);
    return `/definitions/${type}/${name}@${version}`;
  }
  return `/definitions/${type}/${name}`;
}

/**
 * Validate UUID format
 */
export function validateUuid(id: string, fieldName = 'id'): void {
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!pattern.test(id)) {
    throw new ValidationError(
      `Invalid UUID format for ${fieldName}: '${id}'`,
      { field: fieldName, value: id }
    );
  }
}

/**
 * Validate pagination parameters
 */
export function validatePagination(limit?: number, offset?: number): void {
  if (limit !== undefined) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw new ValidationError('Limit must be an integer between 1 and 200', {
        field: 'limit', value: limit, min: 1, max: 200,
      });
    }
  }

  if (offset !== undefined) {
    if (!Number.isInteger(offset) || offset < 0) {
      throw new ValidationError('Offset must be a non-negative integer', {
        field: 'offset', value: offset,
      });
    }
  }
}
