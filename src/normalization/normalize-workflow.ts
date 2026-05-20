/**
 * WDL v3 YAML → runtime shape normalization.
 *
 * Transforms the WDL authoring format into the structure
 * that WorkflowExecutor expects at runtime:
 *
 *   - steps[].command → commands[], steps[].agent → agentRefs[]
 *   - condition → skip_if (negated: "run when true" → "skip when NOT true")
 *   - gate.aggregate defaults to 'average' if missing
 *
 * Pure function — returns a new object, does not mutate the input.
 */
export function normalizeWorkflowSection(section: Record<string, unknown>): Record<string, unknown> {
  const out = structuredClone(section);

  const orchestration = out['orchestration'] as Record<string, unknown> | undefined;
  if (!orchestration) return out;

  const phases = orchestration['phases'] as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(phases)) return out;

  for (const phase of phases) {
    // steps[].command → commands[], steps[].agent → agentRefs[]
    if (!phase['commands'] && Array.isArray(phase['steps'])) {
      const steps = phase['steps'] as Array<Record<string, unknown>>;
      phase['commands'] = steps
        .map(s => s['command'] as string)
        .filter(Boolean);
      const agents = steps
        .map(s => s['agent'] as string)
        .filter(Boolean);
      if (agents.length > 0) {
        phase['agentRefs'] = agents;
      }
      delete phase['steps'];
    }

    // condition → skip_if (negated)
    if (phase['condition'] && !phase['skip_if']) {
      phase['skip_if'] = `NOT (${phase['condition']})`;
      delete phase['condition'];
    }

    // Ensure gate.aggregate has a default
    const gate = phase['gate'] as Record<string, unknown> | undefined;
    if (gate && !gate['aggregate']) {
      gate['aggregate'] = 'average';
    }
  }

  return out;
}
