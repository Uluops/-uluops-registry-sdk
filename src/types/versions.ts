/**
 * Version-related types for the Registry SDK
 */

import type { ChangeType, DefinitionStatus } from './enums.js';

/**
 * Version snapshot of a definition
 */
export interface DefinitionVersion {
  id: string;
  definitionId: string;
  version: string;
  yaml: string;
  hash: string;
  status: DefinitionStatus;
  createdAt: string;
  publishedAt?: string | null;
  deprecatedAt?: string | null;
  changeType?: ChangeType | null;
  changeSummary?: string | null;
}

/**
 * Lightweight version info for list responses
 */
export interface VersionListItem {
  version: string;
  status: DefinitionStatus;
  createdAt: string;
  publishedAt?: string | null;
  deprecatedAt?: string | null;
  changeType?: ChangeType | null;
  changeSummary?: string | null;
}

/**
 * Version diff response
 */
export interface VersionDiff {
  from: VersionListItem;
  to: VersionListItem;
  changes: VersionChanges;
}

/**
 * Detailed changes between two versions
 */
export interface VersionChanges {
  yaml?: {
    added: number;
    removed: number;
    modified: number;
  };
  metadata?: Record<string, { from: unknown; to: unknown }>;
}
