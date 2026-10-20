import { describe, expect, it } from 'vitest';
import baseline from '../src/config/baseline-v1.json';
import type { EconomyConfig } from '../src/config/types';
import { validateConfig } from '../src/config/validate';

const base = baseline as EconomyConfig;
const withChange = (change: Partial<EconomyConfig>): EconomyConfig => ({ ...base, ...change });

describe('baseline-v1', () => {
  it('validates', () => {
    expect(() => validateConfig(base)).not.toThrow();
  });

  it('holds exactly the GDD §5 values', () => {
    expect(base).toEqual({
      id: 'baseline-v1',
      sessionSeconds: 300,
      startCoins: 20,
      startStock: 5,
      shelfCap: 20,
      restockCost: 10,
      restockBatch: 5,
      salePrice: 5,
      customerInterval: 3,
      upgradeBaseCost: 50,
      upgradeCostGrowth: 1.5,
      upgradePriceStep: 2,
      rankThresholds: { bronze: 500, silver: 1500, gold: 3000 },
    });
  });
});

describe('validateConfig rejects', () => {
  const cases: [string, Partial<EconomyConfig>, RegExp][] = [
    ['an empty id', { id: '' }, /id must be/],
    ['a non-integer cost', { restockCost: 10.5 }, /restockCost must be a positive integer/],
    ['a zero quantity', { restockBatch: 0 }, /restockBatch must be a positive integer/],
    ['a negative price step', { upgradePriceStep: -2 }, /upgradePriceStep must be a positive integer/],
    ['restockBatch > shelfCap', { restockBatch: 25 }, /restockBatch \(25\) must be <= shelfCap/],
    ['a zero customer interval', { customerInterval: 0 }, /customerInterval must be positive/],
    ['a zero session length', { sessionSeconds: 0 }, /sessionSeconds must be positive/],
    ['a zero cost growth', { upgradeCostGrowth: 0 }, /upgradeCostGrowth must be a positive number/],
    ['negative startStock', { startStock: -1 }, /startStock must be an integer in \[0, shelfCap\]/],
    ['startStock above shelfCap', { startStock: 21 }, /startStock must be an integer in \[0, shelfCap\]/],
    ['startCoins below restockCost', { startCoins: 9 }, /startCoins \(9\) must be >= restockCost/],
    ['non-positive unit contribution', { salePrice: 2 }, /salePrice - restockCost\/restockBatch must be > 0/],
  ];

  it.each(cases)('%s', (_name, change, message) => {
    expect(() => validateConfig(withChange(change))).toThrow(message);
  });
});
