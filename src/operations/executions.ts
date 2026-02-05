/**
 * Execution statistics operations for the Registry SDK
 */

import type { RegistryHttpClient } from '../http/http-client.js';
import type {
  RecordExecutionBody,
  RecordExecutionResult,
  ExecutionStats,
} from '../types/responses.js';
import type { DefinitionType } from '../types/enums.js';
import { buildDefinitionPath } from '../config/validators.js';

/**
 * Record an execution of a definition
 * Idempotent: if runId is provided and already recorded, returns existing count
 */
export async function record(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
  body: RecordExecutionBody
): Promise<RecordExecutionResult> {
  const path = `${buildDefinitionPath(type, name, version)}/executions`;
  return http.post<RecordExecutionResult>(path, body);
}

/**
 * Get execution statistics for a definition
 * @param window Time window in minutes (1-10080, default 60)
 */
export async function getStats(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
  window?: number
): Promise<ExecutionStats> {
  const path = `${buildDefinitionPath(type, name, version)}/executions`;
  return http.get<ExecutionStats>(path, window ? { window } : undefined);
}
