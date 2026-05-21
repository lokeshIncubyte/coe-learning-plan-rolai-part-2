---
id: cycle-004
slug: engine-cascade-depth-limit
status: done
source: "Day 9: Cascade loop detection with max depth limit"
covers: error-path
group: engine-cascade
---

## Dependencies

**(none — pure logic cycle)**

## Behavior
`EngineService.runCascades(state, spec, depth)` returns an empty array immediately when `depth >= 5`, preventing infinite cascade loops. This is the safety valve for cascade chains. Integration smoke: create a real `EngineService`, define a spec where a single rule always fires (`x > 0 → x: 1`), call `runCascades({ x: 1 }, spec, 5)` — assert result is `[]` and no exception is thrown.

## RED
- **Test file**: `server/src/generate/engine.service.spec.ts`
- **Assertion**:
  ```ts
  const circularSpec: UpdateSpec = {
    variables: {},
    cascades: [
      { when: { key: 'x', op: '>', value: 0 }, apply: { x: 1 } },
    ],
  };

  describe('runCascades depth limit', () => {
    it('returns [] when depth >= 5 without throwing', () => {
      const engine = new EngineService(null as any);
      const result = engine.runCascades({ x: 1 }, circularSpec, 5);
      expect(result).toEqual([]);
    });
  });
  ```
- **Why it fails**: After cycle-003 GREEN is applied, `runCascades` fires the cascade rule at depth 5 instead of returning `[]`.

## GREEN
- **Smallest change**: Add a guard at the top of `runCascades`: `if ((depth ?? 0) >= 5) return [];`
- **Files touched**: `server/src/generate/engine.service.ts`

## REFACTOR
none
