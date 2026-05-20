import { Injectable } from '@nestjs/common';
import { GraphService } from './graph.service';
import type { UpdateSpec } from './update-spec';
import type { Delta, StateMutationDelta, IdentityShiftDelta } from '../upload/extractor.service';

@Injectable()
export class EngineService {
  constructor(private readonly graphService: GraphService) {}

  clampPatch(patch: Record<string, unknown>, spec: UpdateSpec): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      const varSpec = spec.variables[key];
      result[key] = varSpec && typeof value === 'number'
        ? this.clampValue(value, varSpec.min, varSpec.max)
        : value;
    }
    return result;
  }

  computeDerived(state: Record<string, unknown>, spec: UpdateSpec): Record<string, unknown> {
    const result: Record<string, unknown> = { ...state };
    for (const varSpec of Object.values(spec.variables)) {
      if (!varSpec.derived) continue;
      for (const [derivedKey, formula] of Object.entries(varSpec.derived)) {
        const num = state[formula.numerator];
        const den = state[formula.denominator];
        if (typeof num === 'number' && typeof den === 'number' && den !== 0) {
          result[derivedKey] = Math.floor(num / den * (formula.multiplier ?? 1));
        }
      }
    }
    return result;
  }

  runCascades(state: Record<string, unknown>, spec: UpdateSpec, depth?: number): Record<string, unknown>[] {
    if ((depth ?? 0) >= 5) return [];
    return (spec.cascades ?? [])
      .filter(rule => this.evalCondition(state, rule.when))
      .map(rule => rule.apply);
  }

  async applyStateMutationDelta(entityId: string, patch: Record<string, unknown>, spec: UpdateSpec): Promise<{ resolved: Record<string, unknown> }> {
    const clamped = this.clampPatch(patch, spec);
    await this.graphService.updateEntityState(entityId, clamped);
    return { resolved: clamped };
  }

  classifyDeltas(deltas: Delta[]): { stateMutations: StateMutationDelta[]; identityShifts: IdentityShiftDelta[] } {
    return {
      stateMutations: deltas.filter((d): d is StateMutationDelta => d.op === 'state_mutation'),
      identityShifts: deltas.filter((d): d is IdentityShiftDelta => d.op === 'identity_shift'),
    };
  }

  private evalCondition(state: Record<string, unknown>, when: { key: string; op: string; value: number }): boolean {
    const stateVal = state[when.key];
    if (typeof stateVal !== 'number') return false;
    switch (when.op) {
      case '<':  return stateVal <  when.value;
      case '<=': return stateVal <= when.value;
      case '>=': return stateVal >= when.value;
      case '>':  return stateVal >  when.value;
      case '==': return stateVal === when.value;
      default:   return false;
    }
  }

  private clampValue(val: unknown, min?: number, max?: number): unknown {
    if (typeof val !== 'number') return val;
    let clamped = val;
    if (min !== undefined) clamped = Math.max(min, clamped);
    if (max !== undefined) clamped = Math.min(max, clamped);
    return clamped;
  }

  async process(input: { narrative: string; choices: string[] }) {
    return input;
  }
}
