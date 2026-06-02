---
id: srv-047
slug: rule-evaluator-conflict-detection
status: done
source: "Day 7 — RuleEvaluatorService: conflict detection"
covers: happy-path
group: rule-evaluator
---

## Behavior
After evaluating and sorting fired rules, `evaluateRules` runs conflict detection. Two rules conflict when their outcome strings contain words from an antonym pair (`allow`/`deny`, `allow`/`block`, `open`/`close`, `enable`/`disable`, `grant`/`revoke`, `accept`/`reject`). Conflicting rules annotate each other's `conflictsWith` array with the other rule's ID. Non-conflicting rules have an empty `conflictsWith` array.

## RED
- **Test file**: `src/generate/rule-evaluator.service.spec.ts`
- **Assertion**:
  ```ts
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
  ```
- **Why it fails**: `conflictsWith` is always `[]` — `detectConflicts` is not implemented.

## GREEN
- **Smallest change**: Add `private detectConflicts(results: RuleResult[]): RuleResult[]` that creates a shallow copy of each result (spreading to get a fresh `conflictsWith: []` array), then O(n²) scans all pairs `(i, j)` calling `this.areOutcomesConflicting(a.outcome, b.outcome)`. When true, push `b.ruleId` onto `a.conflictsWith` and `a.ruleId` onto `b.conflictsWith`. Return the annotated array. Add `private areOutcomesConflicting(a: string, b: string): boolean` that lowercases both strings and checks the six antonym pairs: `['allow','deny']`, `['allow','block']`, `['open','close']`, `['enable','disable']`, `['grant','revoke']`, `['accept','reject']` — returning `true` if one string includes `word1` and the other includes `word2` or vice versa. Call `detectConflicts` at the end of `evaluateRules`, replacing the direct `return results`.
- **Files touched**: `src/generate/rule-evaluator.service.ts`

## REFACTOR
Consider extracting the antonym pairs to a module-level constant `CONFLICT_PAIRS` to allow future extension without touching method logic.
