/**
 * Dependency graph types for the Registry SDK
 */

import type { DefinitionStatus, DefinitionType } from './enums.js';

/**
 * Node in the dependency graph
 */
export interface DependencyNode {
  id: string;
  type: DefinitionType;
  name: string;
  version: string;
  status: DefinitionStatus;
}

/**
 * Edge in the dependency graph
 */
export interface DependencyEdge {
  from: string;
  to: string;
  type: string;
}

/**
 * Full dependency graph
 */
export interface DependencyGraph {
  nodes?: DependencyNode[];
  edges?: DependencyEdge[];
  cycleDetected?: boolean;
  cycles?: string[][];
}

/**
 * Query options for dependency operations
 */
export interface GetDependenciesOptions {
  maxDepth?: number;
}
