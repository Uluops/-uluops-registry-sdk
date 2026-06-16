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
import { recordExecutionResultSchema, executionStatsSchema } from '../types/schemas.js';
import { parseResponse } from '../http/parse-response.js';

/**
 * Record an execution of a definition.
 * Idempotent: if runId is provided and already recorded, returns existing count.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version that was executed
 * @param body - Execution details (runId, model, durationMs, score, decision)
 * @returns Execution result with updated count
 */
export async function record(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
  body: RecordExecutionBody
): Promise<RecordExecutionResult> {
  const path = `${buildDefinitionPath(type, name, version)}/executions`;
  return parseResponse(recordExecutionResultSchema, await http.post<RecordExecutionResult>(path, body, { retryMutations: true }), 'executions.record');
}

/**
 * Get execution statistics for a definition.
 *
 * @param http - Registry HTTP client
 * @param type - Definition type (agent, command, workflow, pipeline)
 * @param name - Definition name
 * @param version - Semver version
 * @param window - Time window in minutes (1-43200, default 60)
 * @returns Execution statistics (count, averages, distribution)
 */
export async function getStats(
  http: RegistryHttpClient,
  type: DefinitionType,
  name: string,
  version: string,
  window?: number
): Promise<ExecutionStats> {
  const path = `${buildDefinitionPath(type, name, version)}/executions`;
  return parseResponse(executionStatsSchema, await http.get<ExecutionStats>(path, window !== undefined ? { window } : undefined), 'executions.getStats');
}
