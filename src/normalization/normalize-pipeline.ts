/**
 * PDL YAML → runtime shape normalization.
 *
 * Infers stage type from structural cues:
 *
 *   - stages with agents[] but no ref/type → type = 'agents'
 *   - stages with ref but no type → type = 'command'
 *
 * Pure function — returns a new object, does not mutate the input.
 */
export function normalizePipelineSection(section: Record<string, unknown>): Record<string, unknown> {
  const out = structuredClone(section);

  const stages = out['stages'] as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(stages)) return out;

  for (const stage of stages) {
    // Stages with agents[] but no ref/type get type='agents'
    if (Array.isArray(stage['agents']) && !stage['ref'] && !stage['type']) {
      stage['type'] = 'agents';
    }
    // Stages with explicit ref but no type default to 'command'
    if (stage['ref'] && !stage['type']) {
      stage['type'] = 'command';
    }
  }

  return out;
}
