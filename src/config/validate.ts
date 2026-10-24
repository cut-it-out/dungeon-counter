import type { EconomyConfig } from './types';

// GDD §4 "Config validation before play". Throws one Error listing every broken rule.
export function validateConfig(cfg: EconomyConfig): EconomyConfig {
  const errors: string[] = [];
  const isPosInt = (n: number) => Number.isInteger(n) && n > 0;

  if (typeof cfg.id !== 'string' || cfg.id.length === 0) errors.push('id must be a non-empty string');

  const positiveIntegers = [
    'startCoins',
    'shelfCap',
    'restockCost',
    'restockBatch',
    'salePrice',
    'upgradeBaseCost',
    'upgradePriceStep',
    'cratesBaseCost',
    'cratesBatchStep',
    'cratesMaxLevel',
  ] as const;
  for (const key of positiveIntegers) {
    if (!isPosInt(cfg[key])) errors.push(`${key} must be a positive integer (got ${cfg[key]})`);
  }

  if (!(cfg.sessionSeconds > 0)) errors.push(`sessionSeconds must be positive (got ${cfg.sessionSeconds})`);
  if (!(cfg.customerInterval > 0)) errors.push(`customerInterval must be positive (got ${cfg.customerInterval})`);
  if (cfg.calmSpeedup !== undefined && !(cfg.calmSpeedup > 0 && cfg.calmSpeedup <= 1)) {
    errors.push(`calmSpeedup must be in (0, 1] (got ${cfg.calmSpeedup})`);
  }
  if (!(cfg.restockCooldown >= 0) || !Number.isFinite(cfg.restockCooldown)) {
    errors.push(`restockCooldown must be a number >= 0 (got ${cfg.restockCooldown})`);
  }
  for (const key of ['upgradeCostGrowth', 'cratesCostGrowth'] as const) {
    if (!(cfg[key] > 0) || !Number.isFinite(cfg[key])) errors.push(`${key} must be a positive number (got ${cfg[key]})`);
  }
  if (cfg.restockBatch > cfg.shelfCap) {
    errors.push(`restockBatch (${cfg.restockBatch}) must be <= shelfCap (${cfg.shelfCap})`);
  }
  const maxBatch = cfg.restockBatch + cfg.cratesBatchStep * cfg.cratesMaxLevel;
  if (maxBatch > cfg.shelfCap) {
    errors.push(`restockBatch + cratesBatchStep * cratesMaxLevel (${maxBatch}) must be <= shelfCap (${cfg.shelfCap})`);
  }
  if (cfg.medals !== undefined) {
    const { bronze, silver, gold } = cfg.medals;
    if (![bronze, silver, gold].every(isPosInt) || !(bronze < silver && silver < gold)) {
      errors.push(`medals must be positive integers with bronze < silver < gold (got ${bronze} / ${silver} / ${gold})`);
    }
  }
  if (!Array.isArray(cfg.rushes)) {
    errors.push('rushes must be an array');
  } else {
    let previousEnd = 0;
    cfg.rushes.forEach((r, i) => {
      if (!(r.intervalS > 0)) errors.push(`rushes[${i}].intervalS must be positive (got ${r.intervalS})`);
      if (!(r.startS >= previousEnd && r.startS < r.endS && r.endS <= cfg.sessionSeconds)) {
        errors.push(`rushes[${i}] must be sorted, non-overlapping and inside the session (got ${r.startS}-${r.endS}s)`);
      }
      previousEnd = r.endS;
    });
  }
  if (!Number.isInteger(cfg.startStock) || cfg.startStock < 0 || cfg.startStock > cfg.shelfCap) {
    errors.push(`startStock must be an integer in [0, shelfCap] (got ${cfg.startStock})`);
  }
  if (cfg.startCoins < cfg.restockCost) {
    errors.push(`startCoins (${cfg.startCoins}) must be >= restockCost (${cfg.restockCost})`);
  }
  if (!(cfg.salePrice - cfg.restockCost / cfg.restockBatch > 0)) {
    errors.push(
      `salePrice - restockCost/restockBatch must be > 0 (got ${cfg.salePrice} - ${cfg.restockCost}/${cfg.restockBatch})`,
    );
  }

  if (errors.length > 0) throw new Error(`Invalid config "${cfg.id}":\n- ${errors.join('\n- ')}`);
  return cfg;
}
