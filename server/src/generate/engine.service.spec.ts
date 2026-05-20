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
