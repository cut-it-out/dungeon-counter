// `upgrade` is Better Brews (the name predates Bigger Crates and is kept for the CSV).
export type EconomyEventType = 'sale' | 'missed_sale' | 'restock' | 'upgrade' | 'crates_upgrade' | 'session_end';

// One CSV row minus the run columns (run_id, run_type, config_id). Values are after the event.
export interface EconomyEvent {
  elapsedMs: number;
  event: EconomyEventType;
  amount: number; // signed coin delta
  coins: number;
  stock: number;
  upgradeLevel: number; // Better Brews level
  price: number;
  cratesLevel: number;
}

export interface EconomyState {
  coins: number;
  stock: number;
  upgradeLevel: number; // Better Brews level
  cratesLevel: number;
  elapsedMs: number; // integer game-time ms
  nextCustomerAt: number; // integer game-time ms of the next scheduled arrival (NO_ARRIVAL when none is left)
  restockReadyAt: number; // integer game-time ms when the restock cooldown ends
  finished: boolean;
}

export type BlockReason = 'need_coins' | 'need_slots' | 'cooldown' | 'dead_shop_guard' | 'max_level';

export type Availability = { ok: true } | { ok: false; reason: BlockReason };
