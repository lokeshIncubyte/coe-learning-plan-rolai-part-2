import type { UpdateSpec } from './update-spec';

describe('update-spec.json enrichment', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const spec: UpdateSpec = require('../config/update-spec.json');

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
