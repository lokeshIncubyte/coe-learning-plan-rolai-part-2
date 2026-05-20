import { RuleEvaluatorService } from './rule-evaluator.service';
import type { EnrichedEntity } from './graph.service';
import type { RuleFacts } from './rule-evaluator.service';

function makeEntity(id: string, overrides: Partial<EnrichedEntity> = {}): EnrichedEntity {
  return { id, name: `Entity-${id}`, type: 'character', archetype: null, backstory: null,
           role: null, tags: [], facts: {}, state: {}, identity_version: 0,
           createdAt: new Date(), updatedAt: new Date(), fromEdges: [], toEdges: [], ...overrides };
}
function makeRule(id: string, name: string, facts: RuleFacts): EnrichedEntity {
  return makeEntity(id, { name, type: 'rule', facts });
}

describe('RuleEvaluatorService', () => {
  let service: RuleEvaluatorService;
  beforeEach(() => { service = new RuleEvaluatorService(); });

  describe('entity-presence trigger', () => {
    it('fires when the entity ID is in the reached set', () => {
      const reached = [makeEntity('hero'), makeEntity('villain')];
      const rules = [makeRule('r1', 'Hero Rule', {
        triggers: [{ type: 'entity-presence', entityId: 'hero' }],
        outcome: 'allow combat', priority: 1,
      })];
      const results = service.evaluateRules(reached, rules);
      expect(results).toHaveLength(1);
      expect(results[0].ruleId).toBe('r1');
    });

    it('does NOT fire when the entity ID is absent from the reached set', () => {
      const reached = [makeEntity('hero')];
      const rules = [makeRule('r1', 'Villain Rule', {
        triggers: [{ type: 'entity-presence', entityId: 'villain' }],
        outcome: 'villain attacks', priority: 1,
      })];
      expect(service.evaluateRules(reached, rules)).toHaveLength(0);
    });

    it('returns empty array when no rules are defined', () => {
      expect(service.evaluateRules([makeEntity('hero')], [])).toEqual([]);
    });

    it('skips rules with null or malformed facts', () => {
      const badRule = makeEntity('bad', { name: 'Bad Rule', type: 'rule', facts: null });
      expect(service.evaluateRules([makeEntity('hero')], [badRule])).toHaveLength(0);
    });
  });
});
