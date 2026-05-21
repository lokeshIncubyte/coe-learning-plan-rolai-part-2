---
id: cycle-001
slug: engine-clamp-happy
status: done
source: "Day 9: Define Update Spec config per state variable; Build EngineService — bounds clamping"
covers: happy-path
group: engine-bounds
---

## Dependencies

**(none — pure logic cycle)**

## Behavior
`EngineService.clampPatch()` reads the `UpdateSpec` for each key in a state patch and clamps numeric values to the declared `min`/`max` bounds. Keys with no spec entry pass through unchanged. Integration smoke: instantiate a real `EngineService` with `null` for GraphService, call `clampPatch({ hp: 150, stamina: -10, gold: 999 }, spec)`, assert result is `{ hp: 100, stamina: 0, gold: 999 }`.

## RED
- **Test file**: `server/src/generate/engine.service.spec.ts`
- **Assertion**:
  ```ts
  import { EngineService } from './engine.service';
  import type { UpdateSpec } from './update-spec';

  const spec: UpdateSpec = {
    variables: {
      hp: { min: 0, max: 100 },
      stamina: { min: 0, max: 50 },
    },
  };

  describe('EngineService', () => {
    describe('clampPatch', () => {
      it('clamps hp above max to 100, stamina below min to 0, passes unknown keys through', () => {
        const engine = new EngineService(null as any);
        const result = engine.clampPatch({ hp: 150, stamina: -10, gold: 999 }, spec);
        expect(result).toEqual({ hp: 100, stamina: 0, gold: 999 });
      });
    });
  });
  ```
- **Why it fails**: `EngineService` currently only has `process()` — `clampPatch` does not exist.

## GREEN
- **Smallest change**: Create `server/src/generate/update-spec.ts` with `UpdateSpec` type (`{ variables: Record<string, SpecVariable> }`), `SpecVariable` type (`{ min?: number; max?: number; derived?: Record<string, DerivedFormula> }`), and `DerivedFormula` type (`{ numerator: string; denominator: string; multiplier?: number }`). Add `clampPatch(patch: Record<string, unknown>, spec: UpdateSpec): Record<string, unknown>` to `EngineService` — iterate patch keys, read `spec.variables[key]?.min/max`, clamp numeric values.
- **Files touched**: `server/src/generate/update-spec.ts` (new), `server/src/generate/engine.service.ts`

## REFACTOR
Extract per-key clamp into a private `clampValue(val: unknown, min?: number, max?: number): unknown` helper.
