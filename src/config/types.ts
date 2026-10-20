// Economy config (GDD §5). Times are in seconds here; the economy converts to integer ms.
export interface EconomyConfig {
  id: string;
  sessionSeconds: number;
  startCoins: number;
  startStock: number;
  shelfCap: number;
  restockCost: number;
  restockBatch: number;
  salePrice: number;
  customerInterval: number;
  upgradeBaseCost: number;
  upgradeCostGrowth: number;
  upgradePriceStep: number;
  // Provisional presentation values only (GDD §5); not validated success criteria.
  rankThresholds: { bronze: number; silver: number; gold: number };
}
