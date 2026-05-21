---
id: cycle-009
slug: engine-rule-conflict-resolve
status: done
source: "Day 9: Rule conflict resolution at runtime — surface contradictions, deterministic resolution"
covers: atomic
---

## Dependencies

**(none — pure logic cycle)**

## Behavior
`EngineService.resolveRuleConflict(candidates, conflictKey)` selects the candidate with the highest `priority` value when two or more cascade rules produce conflicting patches for the same state key. If priorities are equal, the first candidate wins. The returned candidate's `patch` is what gets applied; the conflict is available to surface in the next generation context via `ruleContext`. Integration smoke: real `EngineService`, two candidates with priorities 2 and 5 conflicting on key `"status"` → `resolveRuleConflict` returns the priority-5 candidate.

## RED
- **Test file**: `server/src/generate/engine.service.spec.ts`
- **Assertion**:
  ```ts
  describe('resolveRuleConflict', () => {
    it('returns the candidate with the highest priority', () => {
      const engine = new EngineService(null as any);
      const candidates = [
        { ruleName: 'low-hp-critical', patch: { status: 'critical' }, priority: 2 },
        { ruleName: 'regeneration-active', patch: { status: 'healing' }, priority: 5 },
      ];

      const resolved = engine.resolveRuleConflict(candidates, 'status');

      expect(resolved.ruleName).toBe('regeneration-active');
      expect(resolved.patch.status).toBe('healing');
    });
  });
  ```
- **Why it fails**: `EngineService` has no `resolveRuleConflict` method.

## GREEN
- **Smallest change**: Add `resolveRuleConflict(candidates: Array<{ ruleName: string; patch: Record<string, unknown>; priority?: number }>, _conflictKey: string): { ruleName: string; patch: Record<string, unknown>; priority?: number }` to `EngineService` — sort descending by `priority ?? 0` and return `candidates[0]`.
- **Files touched**: `server/src/generate/engine.service.ts`

## REFACTOR
none
