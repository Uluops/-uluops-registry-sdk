/**
 * Input validation helpers for the Registry SDK
 */

import { DEFINITION_TYPES, type DefinitionType } from '../types/enums.js';
import { MAX_YAML_SIZE } from './constants.js';

/**
 * Validate that a value is a valid definition type
 */
export function validateDefinitionType(type: string): asserts type is DefinitionType {
  if (!DEFINITION_TYPES.includes(type as DefinitionType)) {
    throw new Error(
      `Invalid definition type '${type}'. Must be one of: ${DEFINITION_TYPES.join(', ')}`
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
    throw new Error('Definition name is required');
  }

  if (name.length < 1 || name.length > 100) {
    throw new Error('Definition name must be 1-100 characters');
  }

  const pattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
  if (!pattern.test(name)) {
    throw new Error(
      'Definition name must be lowercase letters, numbers, and hyphens. ' +
        'Cannot start or end with hyphen.'
    );
  }
}

/**
 * Validate version format (semver)
 */
export function validateVersion(version: string): void {
  if (!version || typeof version !== 'string') {
    throw new Error('Version is required');
  }

  const pattern = /^\d+\.\d+\.\d+$/;
  if (!pattern.test(version)) {
    throw new Error(`Invalid version '${version}'. Must be semver format (X.Y.Z)`);
  }
}

/**
 * Validate YAML content size
 */
export function validateYamlSize(yaml: string): void {
  const bytes = Buffer.byteLength(yaml, 'utf-8');
  if (bytes > MAX_YAML_SIZE) {
    throw new Error(
      `YAML content exceeds maximum size of ${MAX_YAML_SIZE / 1024}KB ` +
        `(${Math.round(bytes / 1024)}KB provided)`
    );
  }
}

/**
 * Parse a definition reference string
 * Format: "name" or "name@version"
 */
export function parseDefinitionRef(ref: string): { name: string; version?: string } {
  if (!ref || typeof ref !== 'string') {
    throw new Error('Definition reference is required');
  }

  const parts = ref.split('@');
  if (parts.length > 2) {
    throw new Error(`Invalid definition reference '${ref}'`);
  }

  const name = parts[0];
  const version = parts[1];

  if (!name) {
    throw new Error('Definition name is required in reference');
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
    throw new Error(`Invalid UUID format for ${fieldName}: '${id}'`);
  }
}

/**
 * Validate pagination parameters
 */
export function validatePagination(limit?: number, offset?: number): void {
  if (limit !== undefined) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw new Error('Limit must be an integer between 1 and 200');
    }
  }

  if (offset !== undefined) {
    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error('Offset must be a non-negative integer');
    }
  }
}
