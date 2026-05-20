/**
 * CDL YAML → runtime shape normalization.
 *
 * Transforms the ergonomic CDL authoring format into the structure
 * that CommandExecutor expects at runtime:
 *
 *   - invokes.agent (string) or invokes.agents (string[]) → agents[]
 *   - top-level preflight → execution.preflight
 *   - top-level postflight → execution.postflight
 *   - overrides.threshold → execution.thresholds.pass
 *
 * Pure function — returns a new object, does not mutate the input.
 */
export function normalizeCommandSection(section: Record<string, unknown>): Record<string, unknown> {
  const out = structuredClone(section);

  // invokes.agent / invokes.agents → agents[]
  if (!out['agents']) {
    const invokes = out['invokes'] as Record<string, unknown> | undefined;
    if (invokes) {
      const agent = invokes['agent'];
      const agents = invokes['agents'];
      if (Array.isArray(agents)) {
        out['agents'] = agents;
      } else if (typeof agent === 'string') {
        out['agents'] = [agent];
      }
    }
  }

  // top-level preflight → execution.preflight
  // CDL preflight is { banner?, checks: PreflightCheck[] } — runtime expects PreflightCheck[]
  const execution = (out['execution'] ?? {}) as Record<string, unknown>;
  if (out['preflight'] && !execution['preflight']) {
    const preflight = out['preflight'] as Record<string, unknown>;
    execution['preflight'] = Array.isArray(preflight['checks']) ? preflight['checks'] : preflight;
    out['execution'] = execution;
  }

  // top-level postflight → execution.postflight
  if (out['postflight'] && !execution['postflight']) {
    execution['postflight'] = out['postflight'];
    out['execution'] = execution;
  }

  // overrides.threshold → execution.thresholds.pass
  const overrides = out['overrides'] as Record<string, unknown> | undefined;
  if (overrides?.['threshold'] && !execution['thresholds']) {
    execution['thresholds'] = { pass: overrides['threshold'] };
    out['execution'] = execution;
  }

  return out;
}
