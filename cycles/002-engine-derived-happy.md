---
id: cycle-002
slug: engine-derived-happy
status: done
source: "Day 9: Implement derived value computation — graph-layer only"
covers: happy-path
group: engine-derived
---

## Dependencies

**(none — pure logic cycle)**

## Behavior
`EngineService.computeDerived()` reads `spec.variables[key].derived` entries and for each derived key computes `Math.floor(state[numerator] / state[denominator] * (multiplier ?? 1))`, merging derived fields into the returned state copy. Integration smoke: real `EngineService`, call `computeDerived({ hp: 75, maxHp: 100 }, spec)` → result contains `{ hp: 75, maxHp: 100, hpPct: 75 }`.

## RED
- **Test file**: `server/src/generate/engine.service.spec.ts`
- **Assertion**:
  ```ts
  import type { UpdateSpec } from './update-spec';

  const derivedSpec: UpdateSpec = {
    variables: {
      hp: {
        derived: { hpPct: { numerator: 'hp', denominator: 'maxHp', multiplier: 100 } },
      },
    },
  };

  describe('computeDerived', () => {
    it('adds hpPct = floor(hp / maxHp * 100) to the returned state', () => {
      const engine = new EngineService(null as any);
      const result = engine.computeDerived({ hp: 75, maxHp: 100 }, derivedSpec);
      expect(result).toMatchObject({ hp: 75, maxHp: 100, hpPct: 75 });
    });
  });
  ```
- **Why it fails**: `EngineService` has no `computeDerived` method.

## GREEN
- **Smallest change**: `DerivedFormula` type is already added in cycle-001 GREEN. Add `computeDerived(state: Record<string, unknown>, spec: UpdateSpec): Record<string, unknown>` to `EngineService` — for each variable entry that has `derived`, iterate derived keys and compute the formula, return spread of original state plus derived fields.
- **Files touched**: `server/src/generate/engine.service.ts`

## REFACTOR
none
