/**
 * Dependency graph types for the Registry SDK
 */

import type { z } from 'zod';
import type {
  dependencyNodeSchema,
  dependentSchema,
  dependentsResponseSchema,
  dependencyGraphResponseSchema,
  flatDepSchema,
} from './response-schemas.js';

/**
 * A node in the dependency graph — recursively contains its own dependencies.
 */
export type DependencyNode = z.infer<typeof dependencyNodeSchema>;

/**
 * A flat row in the dependency graph's pre-flattened view.
 */
export type FlatDep = z.infer<typeof flatDepSchema>;

/**
 * A single dependent — a definition that references the target.
 */
export type Dependent = z.infer<typeof dependentSchema>;

/**
 * Envelope returned by `getDependents()`.
 */
export type DependentsResponse = z.infer<typeof dependentsResponseSchema>;

/**
 * Envelope returned by `get()` (the dependency graph).
 */
export type DependencyGraphResponse = z.infer<typeof dependencyGraphResponseSchema>;

/**
 * Query options for dependency operations.
 */
export interface GetDependenciesOptions {
  maxDepth?: number;
}
