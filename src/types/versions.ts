/**
 * Version-related types for the Registry SDK
 */

import type { ChangeType } from './enums.js';

/**
 * Version snapshot of a definition
 */
export interface DefinitionVersion {
  id: string;
  definitionId: string;
  version: string;
  yaml: string;
  hash: string;
  runtimeMd?: string | null;
  translatorVersion?: string | null;
  schemaVersion?: string | null;
  createdAt: string;
  createdBy: string;
  changeType?: ChangeType | null;
  changeSummary?: string | null;
}

/**
 * Lightweight version info for list responses
 */
export interface VersionListItem {
  id: string;
  version: string;
  hash: string;
  createdAt: string;
  createdBy: string;
  changeType?: ChangeType | null;
  changeSummary?: string | null;
}

/**
 * Full version diff response (returned when full=true)
 */
export interface VersionDiff {
  fromVersion: string;
  toVersion: string;
  fromYaml: string;
  toYaml: string;
  fromHash: string;
  toHash: string;
  hasChanges: boolean;
}

/**
 * Summary version diff response (default, returned when full is omitted or false).
 * Provides section-level changes without raw YAML content.
 */
export interface VersionDiffSummary {
  fromVersion: string;
  toVersion: string;
  fromHash: string;
  toHash: string;
  hasChanges: boolean;
  fromLineCount: number;
  toLineCount: number;
  sectionsAdded: string[];
  sectionsRemoved: string[];
  sectionsModified: string[];
  sectionsUnchanged: string[];
}

/**
 * Field-level diff response (returned when format=fields).
 * Includes per-field changes, classification, and suggested version bump.
 */
export interface VersionFieldDiff {
  fromVersion: string;
  toVersion: string;
  fromHash: string;
  toHash: string;
  hasChanges: boolean;
  fields: Array<{
    path: string;
    type: 'added' | 'removed' | 'modified' | 'moved';
    fromPath?: string;
    oldValue?: unknown;
    newValue?: unknown;
    valueDiff?: Array<[number, string]>;
    arrayChanges?: Array<{ index: number; type: string; oldValue?: unknown; newValue?: unknown; fromIndex?: number }>;
  }>;
  summary: { added: number; removed: number; modified: number; unchanged: number };
  sections: { added: string[]; removed: string[]; modified: string[]; unchanged: string[] };
  classified: Array<{
    path: string;
    type: string;
    significance: 'breaking' | 'structural' | 'cosmetic' | 'metadata';
    reason: string;
    oldValue?: unknown;
    newValue?: unknown;
  }>;
  suggestedBump: 'major' | 'minor' | 'patch';
}

/**
 * Unified line diff response (returned when format=unified).
 */
export interface VersionUnifiedDiff {
  fromVersion: string;
  toVersion: string;
  fromHash: string;
  toHash: string;
  hasChanges: boolean;
  unified: string;
  fromLineCount: number;
  toLineCount: number;
}
