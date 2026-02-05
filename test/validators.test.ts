/**
 * Tests for input validation functions
 */

import { describe, it, expect } from 'vitest';
import {
  validateDefinitionType,
  validateDefinitionName,
  validateVersion,
  validateYamlSize,
  validateUuid,
  validatePagination,
  parseDefinitionRef,
  buildDefinitionPath,
} from '../src/config/validators.js';
import { MAX_YAML_SIZE } from '../src/config/constants.js';

describe('validators', () => {
  describe('validateDefinitionType', () => {
    it('should accept valid definition types', () => {
      expect(() => validateDefinitionType('agent')).not.toThrow();
      expect(() => validateDefinitionType('command')).not.toThrow();
      expect(() => validateDefinitionType('workflow')).not.toThrow();
      expect(() => validateDefinitionType('pipeline')).not.toThrow();
    });

    it('should reject invalid definition types', () => {
      expect(() => validateDefinitionType('invalid')).toThrow(
        "Invalid definition type 'invalid'"
      );
      expect(() => validateDefinitionType('')).toThrow('Invalid definition type');
      expect(() => validateDefinitionType('AGENT')).toThrow('Invalid definition type');
    });
  });

  describe('validateDefinitionName', () => {
    it('should accept valid names', () => {
      expect(() => validateDefinitionName('a')).not.toThrow();
      expect(() => validateDefinitionName('test')).not.toThrow();
      expect(() => validateDefinitionName('my-agent')).not.toThrow();
      expect(() => validateDefinitionName('code-validator-v2')).not.toThrow();
      expect(() => validateDefinitionName('a1')).not.toThrow();
      expect(() => validateDefinitionName('test123')).not.toThrow();
    });

    it('should reject names starting with hyphen', () => {
      expect(() => validateDefinitionName('-test')).toThrow(
        'Cannot start or end with hyphen'
      );
    });

    it('should reject names ending with hyphen', () => {
      expect(() => validateDefinitionName('test-')).toThrow(
        'Cannot start or end with hyphen'
      );
    });

    it('should reject names with uppercase letters', () => {
      expect(() => validateDefinitionName('Test')).toThrow(
        'must be lowercase letters'
      );
      expect(() => validateDefinitionName('myAgent')).toThrow(
        'must be lowercase letters'
      );
    });

    it('should reject names with invalid characters', () => {
      expect(() => validateDefinitionName('test_agent')).toThrow(
        'must be lowercase letters'
      );
      expect(() => validateDefinitionName('test.agent')).toThrow(
        'must be lowercase letters'
      );
      expect(() => validateDefinitionName('test agent')).toThrow(
        'must be lowercase letters'
      );
    });

    it('should reject empty names', () => {
      expect(() => validateDefinitionName('')).toThrow('Definition name is required');
    });

    it('should reject names over 100 characters', () => {
      const longName = 'a'.repeat(101);
      expect(() => validateDefinitionName(longName)).toThrow(
        'must be 1-100 characters'
      );
    });

    it('should accept names at exactly 100 characters', () => {
      const maxName = 'a'.repeat(100);
      expect(() => validateDefinitionName(maxName)).not.toThrow();
    });

    it('should handle single character names', () => {
      expect(() => validateDefinitionName('a')).not.toThrow();
      expect(() => validateDefinitionName('1')).not.toThrow();
    });
  });

  describe('validateVersion', () => {
    it('should accept valid semver versions', () => {
      expect(() => validateVersion('1.0.0')).not.toThrow();
      expect(() => validateVersion('0.0.1')).not.toThrow();
      expect(() => validateVersion('10.20.30')).not.toThrow();
      expect(() => validateVersion('123.456.789')).not.toThrow();
    });

    it('should reject invalid version formats', () => {
      expect(() => validateVersion('1.0')).toThrow('Must be semver format (X.Y.Z)');
      expect(() => validateVersion('1')).toThrow('Must be semver format');
      expect(() => validateVersion('v1.0.0')).toThrow('Must be semver format');
      expect(() => validateVersion('1.0.0-beta')).toThrow('Must be semver format');
      expect(() => validateVersion('1.0.0+build')).toThrow('Must be semver format');
    });

    it('should reject empty versions', () => {
      expect(() => validateVersion('')).toThrow('Version is required');
    });

    it('should reject non-string versions', () => {
      // @ts-expect-error Testing invalid input
      expect(() => validateVersion(null)).toThrow('Version is required');
      // @ts-expect-error Testing invalid input
      expect(() => validateVersion(undefined)).toThrow('Version is required');
    });
  });

  describe('validateYamlSize', () => {
    it('should accept YAML under the limit', () => {
      const smallYaml = 'agent:\n  name: test';
      expect(() => validateYamlSize(smallYaml)).not.toThrow();
    });

    it('should accept YAML at exactly the limit', () => {
      const exactYaml = 'a'.repeat(MAX_YAML_SIZE);
      expect(() => validateYamlSize(exactYaml)).not.toThrow();
    });

    it('should reject YAML over the limit', () => {
      const largeYaml = 'a'.repeat(MAX_YAML_SIZE + 1);
      expect(() => validateYamlSize(largeYaml)).toThrow(
        `YAML content exceeds maximum size of ${MAX_YAML_SIZE / 1024}KB`
      );
    });

    it('should handle multi-byte characters correctly', () => {
      // Unicode characters take more bytes than their length
      const unicodeYaml = '\u{1F600}'.repeat(MAX_YAML_SIZE / 4 + 1);
      expect(() => validateYamlSize(unicodeYaml)).toThrow('exceeds maximum size');
    });

    it('should accept empty YAML', () => {
      expect(() => validateYamlSize('')).not.toThrow();
    });
  });

  describe('validateUuid', () => {
    it('should accept valid UUIDs', () => {
      expect(() =>
        validateUuid('00000000-0000-0000-0000-000000000000')
      ).not.toThrow();
      expect(() =>
        validateUuid('123e4567-e89b-12d3-a456-426614174000')
      ).not.toThrow();
      expect(() =>
        validateUuid('ABCDEF12-3456-7890-ABCD-EF1234567890')
      ).not.toThrow();
    });

    it('should reject invalid UUID formats', () => {
      expect(() => validateUuid('not-a-uuid')).toThrow('Invalid UUID format');
      expect(() => validateUuid('123e4567e89b12d3a456426614174000')).toThrow(
        'Invalid UUID format'
      );
      expect(() => validateUuid('123e4567-e89b-12d3-a456')).toThrow(
        'Invalid UUID format'
      );
      expect(() => validateUuid('')).toThrow('Invalid UUID format');
    });

    it('should include field name in error message', () => {
      expect(() => validateUuid('invalid', 'userId')).toThrow(
        "Invalid UUID format for userId: 'invalid'"
      );
    });
  });

  describe('validatePagination', () => {
    it('should accept valid pagination parameters', () => {
      expect(() => validatePagination(1, 0)).not.toThrow();
      expect(() => validatePagination(50, 100)).not.toThrow();
      expect(() => validatePagination(200, 0)).not.toThrow();
    });

    it('should accept undefined parameters', () => {
      expect(() => validatePagination()).not.toThrow();
      expect(() => validatePagination(undefined, undefined)).not.toThrow();
      expect(() => validatePagination(50)).not.toThrow();
      expect(() => validatePagination(undefined, 10)).not.toThrow();
    });

    it('should reject limit below 1', () => {
      expect(() => validatePagination(0)).toThrow(
        'Limit must be an integer between 1 and 200'
      );
      expect(() => validatePagination(-1)).toThrow(
        'Limit must be an integer between 1 and 200'
      );
    });

    it('should reject limit above 200', () => {
      expect(() => validatePagination(201)).toThrow(
        'Limit must be an integer between 1 and 200'
      );
    });

    it('should reject non-integer limit', () => {
      expect(() => validatePagination(1.5)).toThrow(
        'Limit must be an integer between 1 and 200'
      );
    });

    it('should reject negative offset', () => {
      expect(() => validatePagination(50, -1)).toThrow(
        'Offset must be a non-negative integer'
      );
    });

    it('should reject non-integer offset', () => {
      expect(() => validatePagination(50, 1.5)).toThrow(
        'Offset must be a non-negative integer'
      );
    });

    it('should accept boundary values', () => {
      expect(() => validatePagination(1)).not.toThrow();
      expect(() => validatePagination(200)).not.toThrow();
      expect(() => validatePagination(50, 0)).not.toThrow();
    });
  });

  describe('parseDefinitionRef', () => {
    it('should parse name without version', () => {
      const result = parseDefinitionRef('my-agent');
      expect(result.name).toBe('my-agent');
      expect(result.version).toBeUndefined();
    });

    it('should parse name with version', () => {
      const result = parseDefinitionRef('my-agent@1.0.0');
      expect(result.name).toBe('my-agent');
      expect(result.version).toBe('1.0.0');
    });

    it('should reject invalid references with multiple @', () => {
      expect(() => parseDefinitionRef('my@agent@1.0.0')).toThrow(
        'Invalid definition reference'
      );
    });

    it('should reject empty references', () => {
      expect(() => parseDefinitionRef('')).toThrow(
        'Definition reference is required'
      );
    });

    it('should validate name format', () => {
      expect(() => parseDefinitionRef('Invalid-Name')).toThrow(
        'must be lowercase letters'
      );
    });

    it('should validate version format when present', () => {
      expect(() => parseDefinitionRef('my-agent@invalid')).toThrow(
        'Must be semver format'
      );
    });
  });

  describe('buildDefinitionPath', () => {
    it('should build path without version', () => {
      const path = buildDefinitionPath('agent', 'my-agent');
      expect(path).toBe('/definitions/agent/my-agent');
    });

    it('should build path with version', () => {
      const path = buildDefinitionPath('agent', 'my-agent', '1.0.0');
      expect(path).toBe('/definitions/agent/my-agent@1.0.0');
    });

    it('should validate type', () => {
      expect(() => buildDefinitionPath('invalid' as any, 'my-agent')).toThrow(
        'Invalid definition type'
      );
    });

    it('should validate name', () => {
      expect(() => buildDefinitionPath('agent', 'Invalid-Name')).toThrow(
        'must be lowercase letters'
      );
    });

    it('should validate version when provided', () => {
      expect(() =>
        buildDefinitionPath('agent', 'my-agent', 'invalid')
      ).toThrow('Must be semver format');
    });
  });
});
