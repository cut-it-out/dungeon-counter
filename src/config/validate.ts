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
  ] as const;
  for (const key of positiveIntegers) {
    if (!isPosInt(cfg[key])) errors.push(`${key} must be a positive integer (got ${cfg[key]})`);
  }

  if (!(cfg.sessionSeconds > 0)) errors.push(`sessionSeconds must be positive (got ${cfg.sessionSeconds})`);
  if (!(cfg.customerInterval > 0)) errors.push(`customerInterval must be positive (got ${cfg.customerInterval})`);
  if (!(cfg.upgradeCostGrowth > 0) || !Number.isFinite(cfg.upgradeCostGrowth)) {
    errors.push(`upgradeCostGrowth must be a positive number (got ${cfg.upgradeCostGrowth})`);
  }
  if (cfg.restockBatch > cfg.shelfCap) {
    errors.push(`restockBatch (${cfg.restockBatch}) must be <= shelfCap (${cfg.shelfCap})`);
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
