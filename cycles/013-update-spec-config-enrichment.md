---
id: cycle-013
slug: update-spec-config-enrichment
status: done
source: "Enrich update-spec.json with a mana variable (min 0, max 100) with a derived mana_pct formula, and at least one cascade rule that fires a stamina penalty when hp < 20"
covers: atomic
---

## Dependencies

**(none — pure config cycle; test imports local JSON and TypeScript type only)**

## Behavior
`src/config/update-spec.json` gains a `mana` variable (`min: 0`, `max: 100`) with a `derived.mana_pct` formula (`numerator: "mana"`, `denominator: "mana_cap"`, `multiplier: 100`) and a cascade rule `{ when: { key: "hp", op: "<", value: 20 }, apply: { stamina: 50 } }`. A new test file `src/generate/update-spec-config.spec.ts` loads the real JSON and asserts every new field is present — this acts as both the unit test and the integration smoke (no server needed).

## RED

- **Test file**: `src/generate/update-spec-config.spec.ts` (new file)
- **Assertion**:
  ```ts
  import specJson from '../config/update-spec.json';
  import type { UpdateSpec } from './update-spec';

  describe('update-spec.json enrichment', () => {
    const spec = specJson as unknown as UpdateSpec;

    it('has mana variable with min 0 and max 100', () => {
      expect(spec.variables.mana).toBeDefined();
      expect(spec.variables.mana.min).toBe(0);
      expect(spec.variables.mana.max).toBe(100);
    });

    it('has a derived mana_pct formula on the mana variable', () => {
      expect(spec.variables.mana.derived?.mana_pct).toBeDefined();
      const formula = spec.variables.mana.derived!.mana_pct;
      expect(typeof formula.numerator).toBe('string');
      expect(typeof formula.denominator).toBe('string');
    });

    it('has at least one cascade rule', () => {
      expect(Array.isArray(spec.cascades)).toBe(true);
      expect(spec.cascades!.length).toBeGreaterThan(0);
    });

    it('cascade rule fires when hp falls below a threshold', () => {
      const hpCascade = spec.cascades!.find(c => c.when.key === 'hp');
      expect(hpCascade).toBeDefined();
      expect(hpCascade!.when.op).toBe('<');
      expect(typeof hpCascade!.when.value).toBe('number');
      expect(Object.keys(hpCascade!.apply).length).toBeGreaterThan(0);
    });
  });
  ```
- **Why it fails**: `spec.variables.mana` is `undefined` — the current JSON only defines `hp` and `cascades: []`.

## GREEN

- **Smallest change**: Edit `src/config/update-spec.json`:
  - Add `"mana": { "min": 0, "max": 100, "derived": { "mana_pct": { "numerator": "mana", "denominator": "mana_cap", "multiplier": 100 } } }` under `variables`.
  - Replace `"cascades": []` with `"cascades": [{ "when": { "key": "hp", "op": "<", "value": 20 }, "apply": { "stamina": 50 } }]`.
- **Files touched**: `src/config/update-spec.json`

## REFACTOR
none
