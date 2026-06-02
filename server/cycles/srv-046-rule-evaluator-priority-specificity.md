---
id: srv-046
slug: rule-evaluator-priority-specificity
status: done
source: "Day 7 — RuleEvaluatorService: priority + specificity sort and AND logic"
covers: happy-path
group: rule-evaluator
---

## Behavior
`evaluateRules` returns fired rules sorted by `priority` descending. When two rules share the same priority, the one with more triggers (higher specificity) appears first. Multiple triggers within a single rule use AND logic — every trigger must be satisfied for the rule to fire. The `specificity` field on `RuleResult` is set to `facts.triggers.length`.

## RED
- **Test file**: `src/generate/rule-evaluator.service.spec.ts`
- **Assertion**:
  ```ts
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
  ```
- **Why it fails**: `evaluateRules` returns results in rule-array insertion order with no sort applied.

## GREEN
- **Smallest change**: After building the `results` array in `evaluateRules`, add `.sort((a, b) => b.priority !== a.priority ? b.priority - a.priority : b.specificity - a.specificity)`. Ensure each pushed `RuleResult` sets `specificity: facts.triggers.length`. The AND logic is already correct from srv-043 (`facts.triggers.every(...)`); verify it is in place.
- **Files touched**: `src/generate/rule-evaluator.service.ts`

## REFACTOR
none
