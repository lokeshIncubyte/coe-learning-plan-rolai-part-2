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

  describe('state-value trigger', () => {
    it('fires when the entity state field matches the expected value', () => {
      const hero = makeEntity('hero', { state: { health: 100 } });
      const rules = [makeRule('r1', 'Healthy', {
        triggers: [{ type: 'state-value', entityId: 'hero', field: 'health', value: 100 }],
        outcome: 'hero is at full strength', priority: 1,
      })];
      expect(service.evaluateRules([hero], rules)).toHaveLength(1);
    });

    it('does NOT fire when the state field has a different value', () => {
      const hero = makeEntity('hero', { state: { health: 50 } });
      const rules = [makeRule('r1', 'Healthy', {
        triggers: [{ type: 'state-value', entityId: 'hero', field: 'health', value: 100 }],
        outcome: 'full strength', priority: 1,
      })];
      expect(service.evaluateRules([hero], rules)).toHaveLength(0);
    });

    it('does NOT fire when the entity is absent from the reached set', () => {
      const rules = [makeRule('r1', 'State Rule', {
        triggers: [{ type: 'state-value', entityId: 'missing', field: 'health', value: 100 }],
        outcome: 'some outcome', priority: 1,
      })];
      expect(service.evaluateRules([], rules)).toHaveLength(0);
    });
  });

  describe('relationship trigger', () => {
    it('fires when an edge fromId→toId with the matching type exists', () => {
      const hero = makeEntity('hero', {
        fromEdges: [{ fromId: 'hero', toId: 'villain', type: 'enemy' } as any],
      });
      const rules = [makeRule('r1', 'Enemy Rule', {
        triggers: [{ type: 'relationship', fromId: 'hero', toId: 'villain', edgeType: 'enemy' }],
        outcome: 'combat is possible', priority: 1,
      })];
      expect(service.evaluateRules([hero, makeEntity('villain')], rules)).toHaveLength(1);
    });

    it('does NOT fire when the edge type does not match', () => {
      const hero = makeEntity('hero', {
        fromEdges: [{ fromId: 'hero', toId: 'villain', type: 'ally' } as any],
      });
      const rules = [makeRule('r1', 'Enemy Rule', {
        triggers: [{ type: 'relationship', fromId: 'hero', toId: 'villain', edgeType: 'enemy' }],
        outcome: 'combat', priority: 1,
      })];
      expect(service.evaluateRules([hero], rules)).toHaveLength(0);
    });

    it('does NOT fire when no edge exists', () => {
      const rules = [makeRule('r1', 'Relation Rule', {
        triggers: [{ type: 'relationship', fromId: 'hero', toId: 'villain', edgeType: 'enemy' }],
        outcome: 'something', priority: 1,
      })];
      expect(service.evaluateRules([makeEntity('hero')], rules)).toHaveLength(0);
    });
  });

  describe('priority and specificity ordering', () => {
    it('orders results by priority descending', () => {
      const reached = [makeEntity('hero')];
      const rules = [
        makeRule('low',  'Low',  { triggers: [{ type: 'entity-presence', entityId: 'hero' }], outcome: 'minor', priority: 1 }),
        makeRule('high', 'High', { triggers: [{ type: 'entity-presence', entityId: 'hero' }], outcome: 'major', priority: 10 }),
      ];
      const results = service.evaluateRules(reached, rules);
      expect(results[0].ruleId).toBe('high');
      expect(results[1].ruleId).toBe('low');
    });

    it('orders by specificity (more triggers = higher) when priority is equal', () => {
      const hero = makeEntity('hero', { state: { health: 100 } });
      const villain = makeEntity('villain');
      const rules = [
        makeRule('simple', 'Simple', {
          triggers: [{ type: 'entity-presence', entityId: 'hero' }],
          outcome: 'simple', priority: 5,
        }),
        makeRule('complex', 'Complex', {
          triggers: [
            { type: 'entity-presence', entityId: 'hero' },
            { type: 'entity-presence', entityId: 'villain' },
          ],
          outcome: 'complex', priority: 5,
        }),
      ];
      const results = service.evaluateRules([hero, villain], rules);
      expect(results[0].ruleId).toBe('complex');
      expect(results[1].ruleId).toBe('simple');
    });

  });

  describe('conflict detection', () => {
    it('flags rules with contradictory outcomes in conflictsWith', () => {
      const hero = makeEntity('hero');
      const rules = [
        makeRule('r1', 'Allow Rule', { triggers: [{ type: 'entity-presence', entityId: 'hero' }], outcome: 'allow entry', priority: 5 }),
        makeRule('r2', 'Deny Rule',  { triggers: [{ type: 'entity-presence', entityId: 'hero' }], outcome: 'deny entry',  priority: 3 }),
      ];
      const results = service.evaluateRules([hero], rules);
      const r1 = results.find(r => r.ruleId === 'r1')!;
      const r2 = results.find(r => r.ruleId === 'r2')!;
      expect(r1.conflictsWith).toContain('r2');
      expect(r2.conflictsWith).toContain('r1');
    });

    it('does NOT mark non-conflicting rules as conflicts', () => {
      const hero = makeEntity('hero');
      const rules = [
        makeRule('r1', 'Speed',    { triggers: [{ type: 'entity-presence', entityId: 'hero' }], outcome: 'hero moves faster', priority: 5 }),
        makeRule('r2', 'Strength', { triggers: [{ type: 'entity-presence', entityId: 'hero' }], outcome: 'hero hits harder', priority: 3 }),
      ];
      const results = service.evaluateRules([hero], rules);
      expect(results.find(r => r.ruleId === 'r1')!.conflictsWith).toHaveLength(0);
    });
  });

  describe('priority and specificity ordering (continued)', () => {
    it('requires ALL triggers to be satisfied (AND logic)', () => {
      const hero = makeEntity('hero');
      const rules = [makeRule('r1', 'Double Rule', {
        triggers: [
          { type: 'entity-presence', entityId: 'hero' },
          { type: 'entity-presence', entityId: 'villain' },
        ],
        outcome: 'encounter', priority: 1,
      })];
      expect(service.evaluateRules([hero], rules)).toHaveLength(0);
      expect(service.evaluateRules([hero, makeEntity('villain')], rules)).toHaveLength(1);
    });
  });
});
