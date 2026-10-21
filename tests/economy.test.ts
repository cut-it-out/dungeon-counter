import { describe, expect, it } from 'vitest';
import baseline from '../src/config/baseline-v1.json';
import type { EconomyConfig } from '../src/config/types';
import {
  advanceTo,
  canRestock,
  canUpgrade,
  createState,
  priceAt,
  restock,
  upgrade,
  upgradeCostAt,
  upgradeSafeAt,
} from '../src/economy/economy';
import type { EconomyEvent, EconomyState } from '../src/economy/types';

const cfg = baseline as EconomyConfig;
const stateWith = (change: Partial<EconomyState>): EconomyState => ({ ...createState(cfg), ...change });
const arrivals = (events: EconomyEvent[]) => events.filter((e) => e.event === 'sale' || e.event === 'missed_sale');

describe('scheduling', () => {
  it('processes 100 arrivals at 3, 6, ..., 300 s', () => {
    const events = advanceTo(createState(cfg), cfg, 300_000);
    const times = arrivals(events).map((e) => e.elapsedMs);
    expect(times).toHaveLength(100);
    expect(times.every((t, i) => t === (i + 1) * 3_000)).toBe(true);
    expect(times[99]).toBe(300_000);
  });

  it('processes the arrival at 300 s before session_end', () => {
    const state = createState(cfg);
    const events = advanceTo(state, cfg, 10_000_000);
    const [arrival, end] = events.slice(-2);
    expect(['sale', 'missed_sale']).toContain(arrival.event);
    expect(arrival.elapsedMs).toBe(300_000);
    expect(end).toMatchObject({ event: 'session_end', elapsedMs: 300_000, amount: 0 });
    expect(state.finished).toBe(true);
  });

  it('yields the same log from one huge advance as from 300 one-second steps or 17 ms frames', () => {
    const huge = advanceTo(createState(cfg), cfg, 10_000_000);

    const stepped = createState(cfg);
    const secondSteps: EconomyEvent[] = [];
    for (let t = 1_000; t <= 300_000; t += 1_000) secondSteps.push(...advanceTo(stepped, cfg, t));

    const framed = createState(cfg);
    const frameSteps: EconomyEvent[] = [];
    for (let t = 17; !framed.finished; t += 17) frameSteps.push(...advanceTo(framed, cfg, t));

    expect(secondSteps).toEqual(huge);
    expect(frameSteps).toEqual(huge);
  });

  it('does not process an arrival before it is due', () => {
    const state = createState(cfg);
    expect(advanceTo(state, cfg, 2_999)).toEqual([]);
    expect(state.elapsedMs).toBe(2_999);
    expect(advanceTo(state, cfg, 3_000)).toHaveLength(1);
  });

  it('ignores input and further time after the session ends', () => {
    const state = createState(cfg);
    advanceTo(state, cfg, 300_000);
    state.coins = 1_000; // would afford anything
    state.stock = 0;
    const before = { ...state };
    expect(restock(state, cfg)).toBeNull();
    expect(upgrade(state, cfg)).toBeNull();
    expect(advanceTo(state, cfg, 400_000)).toEqual([]);
    expect(state).toEqual(before);
  });
});

describe('customers', () => {
  it('sells one potion at the current price', () => {
    const state = stateWith({ stock: 2, coins: 0, upgradeLevel: 1 });
    const [sale] = advanceTo(state, cfg, 3_000);
    expect(sale).toEqual({ elapsedMs: 3_000, event: 'sale', amount: 7, coins: 7, stock: 1, upgradeLevel: 1, price: 7 });
  });

  it('records a missed sale at stock 0 without changing coins', () => {
    const state = stateWith({ stock: 0, coins: 12 });
    const [missed] = advanceTo(state, cfg, 3_000);
    expect(missed).toMatchObject({ event: 'missed_sale', amount: 0, coins: 12, stock: 0 });
  });
});

describe('restock', () => {
  it('adds exactly one batch for exactly restockCost', () => {
    const state = stateWith({ stock: 15, coins: 10 });
    expect(canRestock(state, cfg)).toEqual({ ok: true });
    expect(restock(state, cfg)).toMatchObject({ event: 'restock', amount: -10, coins: 0, stock: 20 });
  });

  it('is blocked at 16/20 with reason need_slots', () => {
    const state = stateWith({ stock: 16, coins: 100 });
    expect(canRestock(state, cfg)).toEqual({ ok: false, reason: 'need_slots' });
    expect(restock(state, cfg)).toBeNull();
    expect(state).toMatchObject({ stock: 16, coins: 100 });
  });

  it('is blocked below restockCost with reason need_coins', () => {
    const state = stateWith({ stock: 0, coins: 9 });
    expect(canRestock(state, cfg)).toEqual({ ok: false, reason: 'need_coins' });
    expect(restock(state, cfg)).toBeNull();
  });
});

describe('upgrade and dead-shop guard', () => {
  it('is blocked by the guard at stock 0, coins 55, cost 50', () => {
    const state = stateWith({ stock: 0, coins: 55 });
    expect(canUpgrade(state, cfg)).toEqual({ ok: false, reason: 'dead_shop_guard' });
    expect(upgrade(state, cfg)).toBeNull();
  });

  it('is allowed at stock 1, coins 55', () => {
    const state = stateWith({ stock: 1, coins: 55 });
    expect(canUpgrade(state, cfg)).toEqual({ ok: true });
    expect(upgrade(state, cfg)).toMatchObject({ event: 'upgrade', amount: -50, coins: 5, upgradeLevel: 1, price: 7 });
  });

  it('is allowed at stock 0 when a restock stays affordable', () => {
    expect(canUpgrade(stateWith({ stock: 0, coins: 60 }), cfg)).toEqual({ ok: true });
  });

  it('reports need_coins before the guard', () => {
    expect(canUpgrade(stateWith({ stock: 0, coins: 49 }), cfg)).toEqual({ ok: false, reason: 'need_coins' });
  });

  it('is blocked at stock 1, coins 52: 2c left + one 7c sale < 10c restock', () => {
    const state = stateWith({ stock: 1, coins: 52 });
    expect(upgradeSafeAt(state, cfg)).toBe(53);
    expect(canUpgrade(state, cfg)).toEqual({ ok: false, reason: 'dead_shop_guard' });
    expect(canUpgrade(stateWith({ stock: 1, coins: 53 }), cfg)).toEqual({ ok: true });
  });

  it('never allows an upgrade after which selling out cannot fund a restock', () => {
    for (let level = 0; level <= 5; level++) {
      for (let stock = 0; stock <= cfg.shelfCap; stock++) {
        for (let coins = 0; coins <= 400; coins++) {
          const state = stateWith({ stock, coins, upgradeLevel: level });
          if (!canUpgrade(state, cfg).ok) continue;
          upgrade(state, cfg);
          expect(state.coins + state.stock * priceAt(cfg, state.upgradeLevel)).toBeGreaterThanOrEqual(cfg.restockCost);
        }
      }
    }
  });
});

describe('formulas', () => {
  it('priceAt = salePrice + upgradePriceStep * L', () => {
    expect([0, 1, 2, 3].map((l) => priceAt(cfg, l))).toEqual([5, 7, 9, 11]);
  });

  it('upgradeCostAt = round(upgradeBaseCost * upgradeCostGrowth ^ L)', () => {
    expect([0, 1, 2, 3, 4].map((l) => upgradeCostAt(cfg, l))).toEqual([50, 75, 113, 169, 253]);
  });
});
