// Economy config (GDD §5). Times are in seconds here; the economy converts to integer ms.

// A rush window: between startS (exclusive) and endS (inclusive) customers arrive every intervalS.
export interface Rush {
  startS: number;
  endS: number;
  intervalS: number;
}

export interface EconomyConfig {
  id: string;
  sessionSeconds: number;
  startCoins: number;
  startStock: number;
  shelfCap: number;
  restockCost: number;
  restockBatch: number; // crate size at Bigger Crates level 0
  restockCooldown: number; // seconds after a restock before the next one
  salePrice: number;
  customerInterval: number; // calm interval, outside the rushes (the first calm stretch)
  // Each later calm stretch's interval = the previous one × calmSpeedup (Session 8). Absent = 1, constant.
  calmSpeedup?: number;
  rushes: Rush[];
  // Better Brews: +upgradePriceStep sale price per level.
  upgradeBaseCost: number;
  upgradeCostGrowth: number;
  upgradePriceStep: number;
  // Bigger Crates: +cratesBatchStep potions per crate per level, same crate cost.
  cratesBaseCost: number;
  cratesCostGrowth: number;
  cratesBatchStep: number;
  cratesMaxLevel: number;
}
