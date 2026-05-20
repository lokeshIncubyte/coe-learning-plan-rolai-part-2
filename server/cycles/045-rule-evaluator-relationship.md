---
id: cycle-045
slug: rule-evaluator-relationship
status: pending
source: "Day 7 — RuleEvaluatorService: relationship trigger"
covers: happy-path
group: rule-evaluator
---

## Behavior
The `relationship` trigger fires when a directed edge with matching `fromId`, `toId`, and `type` is found in any reached entity's `fromEdges`. Only `fromEdges` are checked because every directed edge appears exactly once in its source entity's `fromEdges` list. If no entity in the reached set has a matching edge, the trigger is not satisfied.

## RED
- **Test file**: `src/generate/rule-evaluator.service.spec.ts`
- **Assertion**:
  ```ts
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
  ```
- **Why it fails**: the `relationship` case falls to `default: return false` in `isTriggerSatisfied`.

## GREEN
- **Smallest change**: Add `case 'relationship':` to `isTriggerSatisfied`. Iterate `reachedEntities`, and for each entity iterate `(entity.fromEdges ?? [])` cast as `Array<{ fromId: string; toId: string; type?: string }>`. Return `true` when `edge.fromId === trigger.fromId && edge.toId === trigger.toId && edge.type === trigger.edgeType`. Return `false` if no matching edge is found after the full scan.
- **Files touched**: `src/generate/rule-evaluator.service.ts`

## REFACTOR
none
