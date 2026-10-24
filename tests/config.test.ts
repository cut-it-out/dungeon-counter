import { describe, expect, it } from 'vitest';
import baseline from '../balancing/configs/baseline-v1.json';
import challenge from '../src/config/challenge-v1.json';
import challengeV2 from '../src/config/challenge-v2.json';
import challengeV4 from '../src/config/challenge-v4.json';
import challengeV5 from '../src/config/challenge-v5.json';
import type { EconomyConfig } from '../src/config/types';
import { validateConfig } from '../src/config/validate';

const base = challenge as EconomyConfig;
const withChange = (change: Partial<EconomyConfig>): EconomyConfig => ({ ...base, ...change });

// The idle-loop baseline is retired from play (Session 6) but kept frozen as a reference for its CSVs.
describe('baseline-v1 reference', () => {
  it('still holds exactly the GDD v3 §5 values', () => {
    expect(baseline).toEqual({
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

describe('challenge-v1', () => {
  it('validates', () => {
    expect(() => validateConfig(base)).not.toThrow();
  });

  it('holds exactly the Session 6 values', () => {
    expect(base).toEqual({
      id: 'challenge-v1',
      sessionSeconds: 300,
      startCoins: 20,
      startStock: 5,
      shelfCap: 20,
      restockCost: 10,
      restockBatch: 5,
      restockCooldown: 5,
      salePrice: 5,
      customerInterval: 4,
      rushes: [
        { startS: 60, endS: 80, intervalS: 1 },
        { startS: 150, endS: 175, intervalS: 0.75 },
        { startS: 240, endS: 270, intervalS: 0.6 },
      ],
      upgradeBaseCost: 50,
      upgradeCostGrowth: 1.5,
      upgradePriceStep: 2,
      cratesBaseCost: 40,
      cratesCostGrowth: 1.5,
      cratesBatchStep: 3,
      cratesMaxLevel: 3,
    });
  });
});

describe('challenge-v2', () => {
  it('validates', () => {
    expect(() => validateConfig(challengeV2 as EconomyConfig)).not.toThrow();
  });

  it('is challenge-v1 plus calmSpeedup 0.85 (Session 8), nothing else', () => {
    expect(challengeV2).toEqual({ ...base, id: 'challenge-v2', calmSpeedup: 0.85 });
  });
});

describe('challenge-v5', () => {
  it('is challenge-v4 with rush 2 at 0.7 s, the last rush at 0.5 s and medals set from my v5 runs (Session 11), nothing else', () => {
    const v4 = challengeV4 as EconomyConfig;
    expect(challengeV5).toEqual({
      ...v4,
      id: 'challenge-v5',
      rushes: [v4.rushes[0], { startS: 150, endS: 175, intervalS: 0.7 }, { startS: 240, endS: 270, intervalS: 0.5 }],
      medals: { bronze: 900, silver: 1050, gold: 1200 },
    });
    expect(() => validateConfig(challengeV5 as EconomyConfig)).not.toThrow();
  });
});

describe('validateConfig rejects', () => {
  const rush = (startS: number, endS: number, intervalS = 1) => ({ startS, endS, intervalS });
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
    ['a negative cooldown', { restockCooldown: -1 }, /restockCooldown must be a number >= 0/],
    ['a zero Crates cost growth', { cratesCostGrowth: 0 }, /cratesCostGrowth must be a positive number/],
    ['a zero Crates max level', { cratesMaxLevel: 0 }, /cratesMaxLevel must be a positive integer/],
    ['a largest crate above shelfCap', { cratesBatchStep: 6 }, /cratesMaxLevel \(23\) must be <= shelfCap/],
    ['a zero calm speed-up', { calmSpeedup: 0 }, /calmSpeedup must be in \(0, 1\]/],
    ['a calm slow-down', { calmSpeedup: 1.2 }, /calmSpeedup must be in \(0, 1\]/],
    ['medals out of order', { medals: { bronze: 900, silver: 850, gold: 1000 } }, /bronze < silver < gold/],
    ['a non-integer medal', { medals: { bronze: 700.5, silver: 850, gold: 1000 } }, /medals must be positive integers/],
    ['a zero rush interval', { rushes: [rush(60, 80, 0)] }, /rushes\[0\]\.intervalS must be positive/],
    ['overlapping rushes', { rushes: [rush(60, 80), rush(70, 90)] }, /rushes\[1\] must be sorted/],
    ['a rush past the session end', { rushes: [rush(290, 310)] }, /rushes\[0\] must be sorted/],
    ['an empty rush window', { rushes: [rush(60, 60)] }, /rushes\[0\] must be sorted/],
  ];

  it.each(cases)('%s', (_name, change, message) => {
    expect(() => validateConfig(withChange(change))).toThrow(message);
  });
});
