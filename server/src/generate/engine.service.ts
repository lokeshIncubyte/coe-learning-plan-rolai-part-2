import { Injectable } from '@nestjs/common';
import { GraphService } from './graph.service';
import type { UpdateSpec } from './update-spec';

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
