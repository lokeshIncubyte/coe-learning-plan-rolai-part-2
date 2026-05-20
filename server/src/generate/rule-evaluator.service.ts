import { Injectable } from '@nestjs/common';
import type { EnrichedEntity } from './graph.service';

export type RuleTrigger =
  | { type: 'entity-presence'; entityId: string }
  | { type: 'state-value'; entityId: string; field: string; value: unknown }
  | { type: 'relationship'; fromId: string; toId: string; edgeType: string };

export type RuleFacts = {
  triggers: RuleTrigger[];
  outcome: string;
  priority: number;
};

export type RuleResult = {
  ruleId: string;
  ruleName: string;
  outcome: string;
  priority: number;
  specificity: number;
  conflictsWith?: string[];
};

@Injectable()
export class RuleEvaluatorService {
  evaluateRules(
    reachedEntities: EnrichedEntity[],
    rules: EnrichedEntity[],
  ): RuleResult[] {
    const results: RuleResult[] = [];

    for (const rule of rules) {
      const facts = rule.facts as RuleFacts | null;
      if (!facts || !Array.isArray(facts.triggers)) continue;

      const allSatisfied = facts.triggers.every((trigger) =>
        this.isTriggerSatisfied(trigger, reachedEntities),
      );

      if (allSatisfied) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          outcome: facts.outcome ?? '',
          priority: facts.priority ?? 0,
          specificity: facts.triggers.length,
          conflictsWith: [],
        });
      }
    }

    return results;
  }

  private isTriggerSatisfied(
    trigger: RuleTrigger,
    reachedEntities: EnrichedEntity[],
  ): boolean {
    switch (trigger.type) {
      case 'entity-presence':
        return reachedEntities.some((e) => e.id === trigger.entityId);
      case 'state-value': {
        const entity = reachedEntities.find((e) => e.id === trigger.entityId);
        if (!entity) return false;
        const state = entity.state as Record<string, unknown> | null;
        if (!state) return false;
        return state[trigger.field] === trigger.value;
      }
      case 'relationship': {
        type EdgeLike = { fromId: string; toId: string; type?: string };
        for (const entity of reachedEntities) {
          for (const edge of (entity.fromEdges ?? []) as EdgeLike[]) {
            if (edge.fromId === trigger.fromId && edge.toId === trigger.toId && edge.type === trigger.edgeType) {
              return true;
            }
          }
        }
        return false;
      }
      default:
        return false;
    }
  }
}
