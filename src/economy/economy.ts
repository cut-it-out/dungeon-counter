import type { EconomyConfig } from '../config/types';
import type { Availability, EconomyEvent, EconomyEventType, EconomyState } from './types';

// Pure game rules (GDD §4/§5). No Phaser imports. Functions mutate the given state
// and return the events they produced; all game time is integer milliseconds.

const toMs = (seconds: number) => Math.round(seconds * 1000);
export const sessionMs = (cfg: EconomyConfig) => toMs(cfg.sessionSeconds);
export const cooldownMs = (cfg: EconomyConfig) => toMs(cfg.restockCooldown);

// nextCustomerAt once every arrival has been processed; integer, so it survives the save check.
export const NO_ARRIVAL = Number.MAX_SAFE_INTEGER;

export const priceAt = (cfg: EconomyConfig, level: number) => cfg.salePrice + cfg.upgradePriceStep * level;

export const upgradeCostAt = (cfg: EconomyConfig, level: number) =>
  Math.round(cfg.upgradeBaseCost * cfg.upgradeCostGrowth ** level);

export const batchAt = (cfg: EconomyConfig, cratesLevel: number) => cfg.restockBatch + cfg.cratesBatchStep * cratesLevel;

export const cratesCostAt = (cfg: EconomyConfig, level: number) =>
  Math.round(cfg.cratesBaseCost * cfg.cratesCostGrowth ** level);

// Arrival schedule (Session 6): the session is cut into calm stretches and rush windows; each
// stretch places arrivals at its start + k × its interval, up to and including its end. Built in
// integer ms so no float drift accumulates, and cached because the scene asks every frame.
// Calm stretch i (0-based) uses customerInterval × calmSpeedup^i (Session 8).
export const calmIntervalMs = (cfg: EconomyConfig, stretch: number) =>
  toMs(cfg.customerInterval * (cfg.calmSpeedup ?? 1) ** stretch);

const arrivalCache = new WeakMap<EconomyConfig, number[]>();

export function arrivalTimes(cfg: EconomyConfig): number[] {
  const cached = arrivalCache.get(cfg);
  if (cached) return cached;
  const times: number[] = [];
  const add = (fromMs: number, toMsIncl: number, stepMs: number) => {
    for (let t = fromMs + stepMs; t <= toMsIncl; t += stepMs) times.push(t);
  };
  let stretchStart = 0;
  cfg.rushes.forEach((rush, i) => {
    add(stretchStart, toMs(rush.startS), calmIntervalMs(cfg, i));
    add(toMs(rush.startS), toMs(rush.endS), toMs(rush.intervalS));
    stretchStart = toMs(rush.endS);
  });
  add(stretchStart, sessionMs(cfg), calmIntervalMs(cfg, cfg.rushes.length));
  arrivalCache.set(cfg, times);
  return times;
}

export const nextArrivalAfter = (cfg: EconomyConfig, tMs: number) =>
  arrivalTimes(cfg).find((t) => t > tMs) ?? NO_ARRIVAL;

// Index of the rush window that tMs falls in (start exclusive, end inclusive, like its arrivals), or -1.
export const rushIndexAt = (cfg: EconomyConfig, tMs: number) =>
  cfg.rushes.findIndex((r) => tMs > toMs(r.startS) && tMs <= toMs(r.endS));

// HUD countdown: the rush in progress and the ms until it ends, or the next rush and the ms until it starts.
export function rushStatus(cfg: EconomyConfig, tMs: number): { active: boolean; msLeft: number } | null {
  const now = rushIndexAt(cfg, tMs);
  if (now >= 0) return { active: true, msLeft: toMs(cfg.rushes[now].endS) - tMs };
  const next = cfg.rushes.find((r) => toMs(r.startS) >= tMs);
  return next ? { active: false, msLeft: toMs(next.startS) - tMs } : null;
}

export function createState(cfg: EconomyConfig): EconomyState {
  return {
    coins: cfg.startCoins,
    stock: cfg.startStock,
    upgradeLevel: 0,
    cratesLevel: 0,
    elapsedMs: 0,
    nextCustomerAt: nextArrivalAfter(cfg, 0),
    restockReadyAt: 0,
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
    cratesLevel: state.cratesLevel,
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
    state.nextCustomerAt = nextArrivalAfter(cfg, state.nextCustomerAt);
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

// need_slots is reported first: neither coins nor waiting would make a restock possible.
// need_coins comes before cooldown, because waiting out the cooldown would not be enough.
export function canRestock(state: EconomyState, cfg: EconomyConfig): Availability {
  if (state.stock > cfg.shelfCap - batchAt(cfg, state.cratesLevel)) return { ok: false, reason: 'need_slots' };
  if (state.coins < cfg.restockCost) return { ok: false, reason: 'need_coins' };
  if (state.elapsedMs < state.restockReadyAt) return { ok: false, reason: 'cooldown' };
  return { ok: true };
}

// Coins at which an upgrade stops creating a dead shop: after paying for it, the coins left plus
// selling out the shelf at the price after the upgrade must still cover one restock.
const safeAt = (cost: number, state: EconomyState, cfg: EconomyConfig, priceAfter: number) =>
  cost + cfg.restockCost - state.stock * priceAfter;

export const upgradeSafeAt = (state: EconomyState, cfg: EconomyConfig) =>
  safeAt(upgradeCostAt(cfg, state.upgradeLevel), state, cfg, priceAt(cfg, state.upgradeLevel + 1));

// Bigger Crates leaves the price unchanged.
export const cratesSafeAt = (state: EconomyState, cfg: EconomyConfig) =>
  safeAt(cratesCostAt(cfg, state.cratesLevel), state, cfg, priceAt(cfg, state.upgradeLevel));

// Dead-shop guard (GDD §4, option B, Session 4): block an upgrade only if even selling the whole
// shelf afterwards could not pay for a restock. At stock 0 this is coins - cost < restockCost.
export function canUpgrade(state: EconomyState, cfg: EconomyConfig): Availability {
  if (state.coins < upgradeCostAt(cfg, state.upgradeLevel)) return { ok: false, reason: 'need_coins' };
  if (state.coins < upgradeSafeAt(state, cfg)) return { ok: false, reason: 'dead_shop_guard' };
  return { ok: true };
}

// Same guard for Bigger Crates, which also stops at cratesMaxLevel.
export function canUpgradeCrates(state: EconomyState, cfg: EconomyConfig): Availability {
  if (state.cratesLevel >= cfg.cratesMaxLevel) return { ok: false, reason: 'max_level' };
  if (state.coins < cratesCostAt(cfg, state.cratesLevel)) return { ok: false, reason: 'need_coins' };
  if (state.coins < cratesSafeAt(state, cfg)) return { ok: false, reason: 'dead_shop_guard' };
  return { ok: true };
}

export function restock(state: EconomyState, cfg: EconomyConfig): EconomyEvent | null {
  if (state.finished || !canRestock(state, cfg).ok) return null;
  state.coins -= cfg.restockCost;
  state.stock += batchAt(cfg, state.cratesLevel);
  state.restockReadyAt = state.elapsedMs + cooldownMs(cfg);
  return makeEvent(state, cfg, 'restock', -cfg.restockCost);
}

export interface RushResult {
  served: number;
  missed: number;
}

export interface SessionSummary {
  revenue: number; // gross sales revenue
  restockSpend: number;
  brewsSpend: number;
  cratesSpend: number;
  upgradeSpend: number; // brewsSpend + cratesSpend
  sold: number;
  missed: number;
  upgradeLevel: number; // Better Brews level
  cratesLevel: number;
  closing: number; // closing coin balance
  profit: number; // closing - startCoins, the personal-best score (Session 6)
  rushes: RushResult[]; // one per config rush window, in order
}

// Summary screen numbers (GDD §3/§5), derived from the event log alone. Accepts log rows
// too (event typed as string), whose session_start/resume markers have amount 0.
export function summarize(
  cfg: EconomyConfig,
  events: (Omit<EconomyEvent, 'event'> & { event: string })[],
): SessionSummary {
  const sum = (type: string) => events.filter((e) => e.event === type).reduce((s, e) => s + e.amount, 0);
  const last = events[events.length - 1];
  const closing = last ? last.coins : cfg.startCoins;
  const brewsSpend = -sum('upgrade');
  const cratesSpend = -sum('crates_upgrade');
  const rushes = cfg.rushes.map(() => ({ served: 0, missed: 0 }));
  for (const e of events) {
    if (e.event !== 'sale' && e.event !== 'missed_sale') continue;
    const rush = rushes[rushIndexAt(cfg, e.elapsedMs)];
    if (rush && e.event === 'sale') rush.served += 1;
    if (rush && e.event === 'missed_sale') rush.missed += 1;
  }
  return {
    revenue: sum('sale'),
    restockSpend: -sum('restock'),
    brewsSpend,
    cratesSpend,
    upgradeSpend: brewsSpend + cratesSpend,
    sold: events.filter((e) => e.event === 'sale').length,
    missed: events.filter((e) => e.event === 'missed_sale').length,
    upgradeLevel: last ? last.upgradeLevel : 0,
    cratesLevel: last ? last.cratesLevel : 0,
    closing,
    profit: closing - cfg.startCoins,
    rushes,
  };
}

export function upgrade(state: EconomyState, cfg: EconomyConfig): EconomyEvent | null {
  if (state.finished || !canUpgrade(state, cfg).ok) return null;
  const cost = upgradeCostAt(cfg, state.upgradeLevel);
  state.coins -= cost;
  state.upgradeLevel += 1;
  return makeEvent(state, cfg, 'upgrade', -cost);
}

export function upgradeCrates(state: EconomyState, cfg: EconomyConfig): EconomyEvent | null {
  if (state.finished || !canUpgradeCrates(state, cfg).ok) return null;
  const cost = cratesCostAt(cfg, state.cratesLevel);
  state.coins -= cost;
  state.cratesLevel += 1;
  return makeEvent(state, cfg, 'crates_upgrade', -cost);
}
