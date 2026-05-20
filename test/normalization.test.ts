/**
 * Tests for definition normalization — CDL, WDL, PDL transforms,
 * structural validators, and the normalizeDefinition orchestrator.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeDefinition,
  normalizeCommandSection,
  normalizeWorkflowSection,
  normalizePipelineSection,
  validateWorkflowStructure,
  validatePipelineStructure,
  DefinitionValidationError,
} from '../src/normalization/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// normalizeCommandSection
// ─────────────────────────────────────────────────────────────────────────────

describe('normalizeCommandSection', () => {
  it('converts invokes.agent (string) to agents[]', () => {
    const input = { invokes: { agent: 'code-validator' } };
    const result = normalizeCommandSection(input);
    expect(result['agents']).toEqual(['code-validator']);
  });

  it('converts invokes.agents (array) to agents[]', () => {
    const input = { invokes: { agents: ['code-validator', 'test-architect'] } };
    const result = normalizeCommandSection(input);
    expect(result['agents']).toEqual(['code-validator', 'test-architect']);
  });

  it('preserves existing agents[] field', () => {
    const input = { agents: ['existing'], invokes: { agent: 'should-not-override' } };
    const result = normalizeCommandSection(input);
    expect(result['agents']).toEqual(['existing']);
  });

  it('moves preflight.checks to execution.preflight', () => {
    const checks = [{ name: 'git-clean', command: 'git status' }];
    const input = { preflight: { banner: 'Checking...', checks } };
    const result = normalizeCommandSection(input);
    const execution = result['execution'] as Record<string, unknown>;
    expect(execution['preflight']).toEqual(checks);
  });

  it('moves preflight as-is when no checks array', () => {
    const preflight = { name: 'simple-check' };
    const input = { preflight };
    const result = normalizeCommandSection(input);
    const execution = result['execution'] as Record<string, unknown>;
    expect(execution['preflight']).toEqual(preflight);
  });

  it('does not override existing execution.preflight', () => {
    const existing = [{ name: 'existing' }];
    const input = { preflight: { checks: [{ name: 'new' }] }, execution: { preflight: existing } };
    const result = normalizeCommandSection(input);
    const execution = result['execution'] as Record<string, unknown>;
    expect(execution['preflight']).toEqual(existing);
  });

  it('moves postflight to execution.postflight', () => {
    const postflight = { tracker: { enabled: true } };
    const input = { postflight };
    const result = normalizeCommandSection(input);
    const execution = result['execution'] as Record<string, unknown>;
    expect(execution['postflight']).toEqual(postflight);
  });

  it('moves overrides.threshold to execution.thresholds.pass', () => {
    const input = { overrides: { threshold: 75 } };
    const result = normalizeCommandSection(input);
    const execution = result['execution'] as Record<string, unknown>;
    expect(execution['thresholds']).toEqual({ pass: 75 });
  });

  it('does not override existing execution.thresholds', () => {
    const input = { overrides: { threshold: 75 }, execution: { thresholds: { pass: 80 } } };
    const result = normalizeCommandSection(input);
    const execution = result['execution'] as Record<string, unknown>;
    expect(execution['thresholds']).toEqual({ pass: 80 });
  });

  it('does not mutate the input', () => {
    const input = { invokes: { agent: 'test' }, preflight: { checks: [{ name: 'c' }] } };
    const frozen = JSON.parse(JSON.stringify(input));
    normalizeCommandSection(input);
    expect(input).toEqual(frozen);
  });

  it('handles empty section', () => {
    const result = normalizeCommandSection({});
    expect(result).toEqual({});
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// normalizeWorkflowSection
// ─────────────────────────────────────────────────────────────────────────────

describe('normalizeWorkflowSection', () => {
  it('converts steps[].command to commands[]', () => {
    const input = {
      orchestration: {
        phases: [{
          steps: [
            { command: 'code-validate' },
            { command: 'test-review' },
          ],
        }],
      },
    };
    const result = normalizeWorkflowSection(input);
    const phases = (result['orchestration'] as Record<string, unknown>)['phases'] as Array<Record<string, unknown>>;
    expect(phases[0]['commands']).toEqual(['code-validate', 'test-review']);
    expect(phases[0]['steps']).toBeUndefined();
  });

  it('extracts steps[].agent to agentRefs[]', () => {
    const input = {
      orchestration: {
        phases: [{
          steps: [
            { command: 'validate', agent: 'code-validator' },
            { command: 'test' },
          ],
        }],
      },
    };
    const result = normalizeWorkflowSection(input);
    const phases = (result['orchestration'] as Record<string, unknown>)['phases'] as Array<Record<string, unknown>>;
    expect(phases[0]['agentRefs']).toEqual(['code-validator']);
  });

  it('omits agentRefs when no agents in steps', () => {
    const input = {
      orchestration: {
        phases: [{
          steps: [{ command: 'code-validate' }],
        }],
      },
    };
    const result = normalizeWorkflowSection(input);
    const phases = (result['orchestration'] as Record<string, unknown>)['phases'] as Array<Record<string, unknown>>;
    expect(phases[0]['agentRefs']).toBeUndefined();
  });

  it('preserves existing commands[] field', () => {
    const input = {
      orchestration: {
        phases: [{
          commands: ['existing'],
          steps: [{ command: 'should-not-override' }],
        }],
      },
    };
    const result = normalizeWorkflowSection(input);
    const phases = (result['orchestration'] as Record<string, unknown>)['phases'] as Array<Record<string, unknown>>;
    expect(phases[0]['commands']).toEqual(['existing']);
  });

  it('converts condition to negated skip_if', () => {
    const input = {
      orchestration: {
        phases: [{
          condition: 'previous_phase.passed',
        }],
      },
    };
    const result = normalizeWorkflowSection(input);
    const phases = (result['orchestration'] as Record<string, unknown>)['phases'] as Array<Record<string, unknown>>;
    expect(phases[0]['skip_if']).toBe('NOT (previous_phase.passed)');
    expect(phases[0]['condition']).toBeUndefined();
  });

  it('preserves existing skip_if', () => {
    const input = {
      orchestration: {
        phases: [{
          condition: 'new-condition',
          skip_if: 'existing-skip',
        }],
      },
    };
    const result = normalizeWorkflowSection(input);
    const phases = (result['orchestration'] as Record<string, unknown>)['phases'] as Array<Record<string, unknown>>;
    expect(phases[0]['skip_if']).toBe('existing-skip');
  });

  it('defaults gate.aggregate to average', () => {
    const input = {
      orchestration: {
        phases: [{
          gate: { threshold: 70 },
        }],
      },
    };
    const result = normalizeWorkflowSection(input);
    const phases = (result['orchestration'] as Record<string, unknown>)['phases'] as Array<Record<string, unknown>>;
    const gate = phases[0]['gate'] as Record<string, unknown>;
    expect(gate['aggregate']).toBe('average');
  });

  it('preserves existing gate.aggregate', () => {
    const input = {
      orchestration: {
        phases: [{
          gate: { threshold: 70, aggregate: 'min' },
        }],
      },
    };
    const result = normalizeWorkflowSection(input);
    const phases = (result['orchestration'] as Record<string, unknown>)['phases'] as Array<Record<string, unknown>>;
    const gate = phases[0]['gate'] as Record<string, unknown>;
    expect(gate['aggregate']).toBe('min');
  });

  it('returns input unchanged when orchestration missing', () => {
    const input = { interface: { name: 'test' } };
    const result = normalizeWorkflowSection(input);
    expect(result).toEqual(input);
  });

  it('returns input unchanged when phases not an array', () => {
    const input = { orchestration: { phases: 'not-an-array' } };
    const result = normalizeWorkflowSection(input);
    expect(result).toEqual(input);
  });

  it('does not mutate the input', () => {
    const input = {
      orchestration: {
        phases: [{
          steps: [{ command: 'test' }],
          condition: 'x',
          gate: { threshold: 70 },
        }],
      },
    };
    const frozen = JSON.parse(JSON.stringify(input));
    normalizeWorkflowSection(input);
    expect(input).toEqual(frozen);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// normalizePipelineSection
// ─────────────────────────────────────────────────────────────────────────────

describe('normalizePipelineSection', () => {
  it('infers type=agents for stages with agents[] and no ref/type', () => {
    const input = {
      stages: [
        { id: 'analysis', agents: [{ ref: 'code-validator' }] },
      ],
    };
    const result = normalizePipelineSection(input);
    const stages = result['stages'] as Array<Record<string, unknown>>;
    expect(stages[0]['type']).toBe('agents');
  });

  it('infers type=command for stages with ref but no type', () => {
    const input = {
      stages: [
        { id: 'validate', ref: 'code-validate' },
      ],
    };
    const result = normalizePipelineSection(input);
    const stages = result['stages'] as Array<Record<string, unknown>>;
    expect(stages[0]['type']).toBe('command');
  });

  it('preserves explicit type', () => {
    const input = {
      stages: [
        { id: 'run', ref: 'my-workflow', type: 'workflow' },
      ],
    };
    const result = normalizePipelineSection(input);
    const stages = result['stages'] as Array<Record<string, unknown>>;
    expect(stages[0]['type']).toBe('workflow');
  });

  it('returns input unchanged when stages missing', () => {
    const input = { interface: { name: 'test' } };
    const result = normalizePipelineSection(input);
    expect(result).toEqual(input);
  });

  it('does not mutate the input', () => {
    const input = {
      stages: [{ id: 'a', agents: [{ ref: 'x' }] }],
    };
    const frozen = JSON.parse(JSON.stringify(input));
    normalizePipelineSection(input);
    expect(input).toEqual(frozen);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateWorkflowStructure
// ─────────────────────────────────────────────────────────────────────────────

describe('validateWorkflowStructure', () => {
  it('passes for valid structure', () => {
    expect(() => validateWorkflowStructure({
      orchestration: { phases: [] },
    })).not.toThrow();
  });

  it('throws for missing orchestration', () => {
    expect(() => validateWorkflowStructure({}))
      .toThrow(DefinitionValidationError);
  });

  it('throws for non-object orchestration', () => {
    expect(() => validateWorkflowStructure({ orchestration: 'string' }))
      .toThrow('missing "orchestration" section');
  });

  it('throws for missing phases', () => {
    expect(() => validateWorkflowStructure({ orchestration: {} }))
      .toThrow('"orchestration.phases" must be an array');
  });

  it('throws for non-array phases', () => {
    expect(() => validateWorkflowStructure({ orchestration: { phases: {} } }))
      .toThrow('"orchestration.phases" must be an array');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validatePipelineStructure
// ─────────────────────────────────────────────────────────────────────────────

describe('validatePipelineStructure', () => {
  it('passes for valid structure', () => {
    expect(() => validatePipelineStructure({ stages: [] })).not.toThrow();
  });

  it('throws for missing stages', () => {
    expect(() => validatePipelineStructure({}))
      .toThrow(DefinitionValidationError);
  });

  it('throws for non-array stages', () => {
    expect(() => validatePipelineStructure({ stages: 'not-array' }))
      .toThrow('"stages" must be an array');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// normalizeDefinition (orchestrator)
// ─────────────────────────────────────────────────────────────────────────────

describe('normalizeDefinition', () => {
  it('detects agent top key and passes through unchanged', () => {
    const input = { agent: { interface: { name: 'test', agentType: 'analyst' } } };
    const { topKey, definition } = normalizeDefinition(input);
    expect(topKey).toBe('agent');
    expect(definition).toEqual(input);
  });

  it('detects command top key and normalizes', () => {
    const input = { command: { invokes: { agent: 'code-validator' } } };
    const { topKey, definition } = normalizeDefinition(input);
    expect(topKey).toBe('command');
    expect((definition['command'] as Record<string, unknown>)['agents']).toEqual(['code-validator']);
  });

  it('detects workflow top key and normalizes', () => {
    const input = {
      workflow: {
        orchestration: {
          phases: [{
            steps: [{ command: 'validate' }],
            gate: { threshold: 70 },
          }],
        },
      },
    };
    const { topKey, definition } = normalizeDefinition(input);
    expect(topKey).toBe('workflow');
    const phases = ((definition['workflow'] as Record<string, unknown>)['orchestration'] as Record<string, unknown>)['phases'] as Array<Record<string, unknown>>;
    expect(phases[0]['commands']).toEqual(['validate']);
    expect((phases[0]['gate'] as Record<string, unknown>)['aggregate']).toBe('average');
  });

  it('detects pipeline top key and normalizes', () => {
    const input = {
      pipeline: {
        stages: [{ id: 'a', agents: [{ ref: 'x' }] }],
      },
    };
    const { topKey, definition } = normalizeDefinition(input);
    expect(topKey).toBe('pipeline');
    const stages = (definition['pipeline'] as Record<string, unknown>)['stages'] as Array<Record<string, unknown>>;
    expect(stages[0]['type']).toBe('agents');
  });

  it('throws for missing top-level key', () => {
    expect(() => normalizeDefinition({ unknown: {} }))
      .toThrow(DefinitionValidationError);
    expect(() => normalizeDefinition({ unknown: {} }))
      .toThrow('expected a top-level key of agent, command, workflow, pipeline');
  });

  it('throws for non-object section', () => {
    expect(() => normalizeDefinition({ agent: 'not-an-object' }))
      .toThrow('"agent" must be an object');
  });

  it('throws for null section', () => {
    expect(() => normalizeDefinition({ command: null }))
      .toThrow('"command" must be an object');
  });

  it('validates workflow structure after normalizing', () => {
    expect(() => normalizeDefinition({ workflow: { noOrchestration: true } }))
      .toThrow('missing "orchestration" section');
  });

  it('validates pipeline structure after normalizing', () => {
    expect(() => normalizeDefinition({ pipeline: { noStages: true } }))
      .toThrow('"stages" must be an array');
  });

  it('does not mutate the input', () => {
    const input = {
      command: {
        invokes: { agent: 'test' },
        preflight: { checks: [{ name: 'c' }] },
        overrides: { threshold: 75 },
      },
    };
    const frozen = JSON.parse(JSON.stringify(input));
    normalizeDefinition(input);
    expect(input).toEqual(frozen);
  });

  it('returns a new object (referential inequality)', () => {
    const input = { agent: { interface: { name: 'test' } } };
    const { definition } = normalizeDefinition(input);
    expect(definition).not.toBe(input);
    expect(definition['agent']).not.toBe(input['agent']);
  });
});
