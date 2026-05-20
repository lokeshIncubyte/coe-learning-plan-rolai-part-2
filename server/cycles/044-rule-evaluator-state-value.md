---
id: cycle-044
slug: rule-evaluator-state-value
status: done
source: "Day 7 — RuleEvaluatorService: state-value trigger"
covers: happy-path
group: rule-evaluator
---

## Behavior
The `state-value` trigger fires when the specified entity is present in `reachedEntities` AND `entity.state[field] === value`. If the entity is absent the trigger is not satisfied. If the field exists but holds a different value, the trigger is not satisfied. An exact strict-equality check is used so `100 !== '100'`.

## RED
- **Test file**: `src/generate/rule-evaluator.service.spec.ts`
- **Assertion**:
  ```ts
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
  ```
- **Why it fails**: the `state-value` case falls to `default: return false` in `isTriggerSatisfied` — the rule never fires even when state matches.

## GREEN
- **Smallest change**: Add `case 'state-value':` to `isTriggerSatisfied`. Find the entity with `reachedEntities.find(e => e.id === trigger.entityId)`. Return `false` if not found. Cast `entity.state` to `Record<string, unknown>` and return `state[trigger.field] === trigger.value`.
- **Files touched**: `src/generate/rule-evaluator.service.ts`

## REFACTOR
none
