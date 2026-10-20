export type EconomyEventType = 'sale' | 'missed_sale' | 'restock' | 'upgrade' | 'session_end';

// One CSV row minus the run columns (run_id, run_type, config_id). Values are after the event.
export interface EconomyEvent {
  elapsedMs: number;
  event: EconomyEventType;
  amount: number; // signed coin delta
  coins: number;
  stock: number;
  upgradeLevel: number;
  price: number;
}

export interface EconomyState {
  coins: number;
  stock: number;
  upgradeLevel: number;
  elapsedMs: number; // integer game-time ms
  nextCustomerAt: number; // integer game-time ms of the next scheduled arrival
  finished: boolean;
}

export type BlockReason = 'need_coins' | 'need_slots' | 'dead_shop_guard';

export type Availability = { ok: true } | { ok: false; reason: BlockReason };
