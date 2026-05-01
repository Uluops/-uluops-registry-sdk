/**
 * Fork-related types for the Registry SDK
 */

import type { Definition, DefinitionListItem } from './definitions.js';
import type { Visibility } from './enums.js';

/**
 * Fork relationship record
 */
export interface Fork {
  id: string;
  sourceDefinitionId: string;
  derivedDefinitionId: string;
  sourceVersion: string;
  createdAt: string;
}

/**
 * Request body for forking a definition
 */
export interface ForkDefinitionBody {
  name: string;
  visibility?: Visibility;
  displayName?: string;
  description?: string;
}

/**
 * Response from creating a fork
 */
export interface ForkResponse {
  definition: Definition;
  fork: Fork;
  source: DefinitionListItem;
  warnings?: string[];
}

/**
 * Forkability check response
 */
export interface ForkableCheck {
  canFork: boolean;
  reason?: string;
  requiresSubscription?: boolean;
}

/**
 * Fork lineage response
 */
export interface ForkLineage {
  current?: DefinitionListItem;
  source?: DefinitionListItem | null;
  chain?: DefinitionListItem[];
}

/**
 * Options for forkability check
 */
export interface CheckForkableOptions {
  canForkAsPrivate?: boolean;
}
