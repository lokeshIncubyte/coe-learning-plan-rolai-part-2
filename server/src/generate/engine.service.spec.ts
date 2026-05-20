import { EngineService } from './engine.service';
import type { UpdateSpec } from './update-spec';

const spec: UpdateSpec = {
  variables: {
    hp: { min: 0, max: 100 },
    stamina: { min: 0, max: 50 },
  },
};

const derivedSpec: UpdateSpec = {
  variables: {
    hp: {
      derived: { hpPct: { numerator: 'hp', denominator: 'maxHp', multiplier: 100 } },
    },
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

  describe('computeDerived', () => {
    it('adds hpPct = floor(hp / maxHp * 100) to the returned state', () => {
      const engine = new EngineService(null as any);
      const result = engine.computeDerived({ hp: 75, maxHp: 100 }, derivedSpec);
      expect(result).toMatchObject({ hp: 75, maxHp: 100, hpPct: 75 });
    });
  });
});
