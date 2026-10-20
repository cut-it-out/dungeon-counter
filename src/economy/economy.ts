import type { EconomyConfig } from '../config/types';
import type { Availability, EconomyEvent, EconomyEventType, EconomyState } from './types';

// Pure game rules (GDD §4/§5). No Phaser imports. Functions mutate the given state
// and return the events they produced; all game time is integer milliseconds.

export const sessionMs = (cfg: EconomyConfig) => Math.round(cfg.sessionSeconds * 1000);
export const intervalMs = (cfg: EconomyConfig) => Math.round(cfg.customerInterval * 1000);

export const priceAt = (cfg: EconomyConfig, level: number) => cfg.salePrice + cfg.upgradePriceStep * level;

export const upgradeCostAt = (cfg: EconomyConfig, level: number) =>
  Math.round(cfg.upgradeBaseCost * cfg.upgradeCostGrowth ** level);

export function createState(cfg: EconomyConfig): EconomyState {
  return {
    coins: cfg.startCoins,
    stock: cfg.startStock,
    upgradeLevel: 0,
    elapsedMs: 0,
    nextCustomerAt: intervalMs(cfg),
    finished: false,
  };
}

function makeEvent(state: EconomyState, cfg: EconomyConfig, event: EconomyEventType, amount: number): EconomyEvent {
  return {
    elapsedMs: state.elapsedMs,
    event,
    amount,
    coins: state.coins,
    stock: state.stock,
    upgradeLevel: state.upgradeLevel,
    price: priceAt(cfg, state.upgradeLevel),
  };
}

// Process every arrival due up to min(tMs, session end), in order. The arrival due at exactly
// the session end is processed before session_end; after that the state is finished.
export function advanceTo(state: EconomyState, cfg: EconomyConfig, tMs: number): EconomyEvent[] {
  if (state.finished) return [];
  const endMs = sessionMs(cfg);
  const target = Math.min(tMs, endMs);
  const events: EconomyEvent[] = [];

  while (state.nextCustomerAt <= target) {
    state.elapsedMs = state.nextCustomerAt;
    state.nextCustomerAt += intervalMs(cfg);
    if (state.stock > 0) {
      const price = priceAt(cfg, state.upgradeLevel);
      state.stock -= 1;
      state.coins += price;
      events.push(makeEvent(state, cfg, 'sale', price));
    } else {
      events.push(makeEvent(state, cfg, 'missed_sale', 0));
    }
  }

  state.elapsedMs = Math.max(state.elapsedMs, target);
  if (target >= endMs) {
    state.finished = true;
    events.push(makeEvent(state, cfg, 'session_end', 0));
  }
  return events;
}

// When both rules block, need_slots is reported: coins alone would not make a restock possible.
export function canRestock(state: EconomyState, cfg: EconomyConfig): Availability {
  if (state.stock > cfg.shelfCap - cfg.restockBatch) return { ok: false, reason: 'need_slots' };
  if (state.coins < cfg.restockCost) return { ok: false, reason: 'need_coins' };
  return { ok: true };
}

// Dead-shop guard (GDD §4): block only if the upgrade would leave stock 0 and coins < restockCost.
export function canUpgrade(state: EconomyState, cfg: EconomyConfig): Availability {
  const cost = upgradeCostAt(cfg, state.upgradeLevel);
  if (state.coins < cost) return { ok: false, reason: 'need_coins' };
  if (state.stock === 0 && state.coins - cost < cfg.restockCost) return { ok: false, reason: 'dead_shop_guard' };
  return { ok: true };
}

export function restock(state: EconomyState, cfg: EconomyConfig): EconomyEvent | null {
  if (state.finished || !canRestock(state, cfg).ok) return null;
  state.coins -= cfg.restockCost;
  state.stock += cfg.restockBatch;
  return makeEvent(state, cfg, 'restock', -cfg.restockCost);
}

export interface SessionSummary {
  revenue: number; // gross sales revenue
  restockSpend: number;
  upgradeSpend: number;
  sold: number;
  missed: number;
  upgradeLevel: number;
  closing: number; // closing coin balance
}

// Summary screen numbers (GDD §3/§5), derived from the event log alone.
export function summarize(cfg: EconomyConfig, events: EconomyEvent[]): SessionSummary {
  const sum = (type: string) => events.filter((e) => e.event === type).reduce((s, e) => s + e.amount, 0);
  const last = events[events.length - 1];
  return {
    revenue: sum('sale'),
    restockSpend: -sum('restock'),
    upgradeSpend: -sum('upgrade'),
    sold: events.filter((e) => e.event === 'sale').length,
    missed: events.filter((e) => e.event === 'missed_sale').length,
    upgradeLevel: last ? last.upgradeLevel : 0,
    closing: last ? last.coins : cfg.startCoins,
  };
}

export function upgrade(state: EconomyState, cfg: EconomyConfig): EconomyEvent | null {
  if (state.finished || !canUpgrade(state, cfg).ok) return null;
  const cost = upgradeCostAt(cfg, state.upgradeLevel);
  state.coins -= cost;
  state.upgradeLevel += 1;
  return makeEvent(state, cfg, 'upgrade', -cost);
}
