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
