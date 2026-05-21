---
id: cycle-003
slug: engine-cascade-happy
status: done
source: "Day 9: Implement cascade triggers — state change → more state changes, confined to graph layer"
covers: happy-path
group: engine-cascade
---

## Dependencies

**(none — pure logic cycle)**

## Behavior
`EngineService.runCascades()` evaluates each `spec.cascades` rule against the provided state. If the `when` condition (`state[key] <op> value`) is satisfied, the rule's `apply` patch is included in the returned array. The caller is responsible for merging patches into state and calling `runCascades` again (up to depth limit — see cycle-004). Integration smoke: see cycle-004 (last in group).

## RED
- **Test file**: `server/src/generate/engine.service.spec.ts`
- **Assertion**:
  ```ts
  const cascadeSpec: UpdateSpec = {
    variables: {},
    cascades: [
      { when: { key: 'hp', op: '<', value: 10 }, apply: { status: 'critical' } },
      { when: { key: 'hp', op: '>=', value: 80 }, apply: { status: 'healthy' } },
    ],
  };

  describe('runCascades', () => {
    it('returns the apply patch for the matching cascade rule when hp < 10', () => {
      const engine = new EngineService(null as any);
      const cascades = engine.runCascades({ hp: 5, maxHp: 100 }, cascadeSpec);
      expect(cascades).toHaveLength(1);
      expect(cascades[0]).toEqual({ status: 'critical' });
    });
  });
  ```
- **Why it fails**: `EngineService` has no `runCascades` method.

## GREEN
- **Smallest change**: Add `CascadeRule` type (`{ when: { key: string; op: '<'|'<='|'>='|'>'|'=='; value: number }; apply: Record<string, unknown>; priority?: number }`) to `update-spec.ts` and add `cascades?: CascadeRule[]` to `UpdateSpec`. Add `runCascades(state: Record<string, unknown>, spec: UpdateSpec, depth?: number): Record<string, unknown>[]` to `EngineService` — filter `spec.cascades` by matching `when` condition, return their `apply` patches.
- **Files touched**: `server/src/generate/update-spec.ts`, `server/src/generate/engine.service.ts`

## REFACTOR
Extract condition evaluation into a private `evalCondition(state, when): boolean` to support all five operators cleanly.
