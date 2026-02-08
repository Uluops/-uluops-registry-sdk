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
 * Version diff response (matches actual API shape)
 */
export interface VersionDiff {
  fromVersion: string;
  toVersion: string;
  fromYaml: string;
  toYaml: string;
}
