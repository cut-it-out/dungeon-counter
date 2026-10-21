import { describe, expect, it } from 'vitest';
import challenge from '../src/config/challenge-v1.json';
import type { EconomyConfig } from '../src/config/types';
import {
  advanceTo,
  arrivalTimes,
  batchAt,
  canRestock,
  canUpgrade,
  canUpgradeCrates,
  cratesCostAt,
  cratesSafeAt,
  createState,
  priceAt,
  restock,
  rushStatus,
  summarize,
  upgrade,
  upgradeCrates,
  upgradeCostAt,
  upgradeSafeAt,
} from '../src/economy/economy';
import type { EconomyEvent, EconomyState } from '../src/economy/types';

const ch = challenge as EconomyConfig;
// The idle-loop schedule on the challenge rules: no rushes, a 3 s interval, no cooldown. The
// scheduling, restock and Brews guard rules below are unchanged from the idle loop, so they keep
// their original numbers; the challenge rules have their own blocks at the end.
const cfg: EconomyConfig = { ...ch, id: 'flat', rushes: [], customerInterval: 3, restockCooldown: 0 };
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
    expect(sale).toEqual({ elapsedMs: 3_000, event: 'sale', amount: 7, coins: 7, stock: 1, upgradeLevel: 1, price: 7, cratesLevel: 0 });
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

const chState = (change: Partial<EconomyState>): EconomyState => ({ ...createState(ch), ...change });

describe('challenge-v1 arrival schedule', () => {
  const times = arrivalTimes(ch);
  const within = (fromMs: number, toMs: number) => times.filter((t) => t > fromMs && t <= toMs);

  it('has 158 integer arrivals, strictly increasing, the last at 298 s', () => {
    expect(times).toHaveLength(158);
    expect(times.every((t, i) => Number.isInteger(t) && (i === 0 || t > times[i - 1]))).toBe(true);
    expect(times[times.length - 1]).toBe(298_000);
  });

  it('arrives every 4 s when calm and every rush interval inside a rush', () => {
    expect(within(0, 60_000)).toEqual(Array.from({ length: 15 }, (_, i) => (i + 1) * 4_000));
    const rush1 = within(60_000, 80_000);
    expect(rush1).toHaveLength(20);
    expect([rush1[0], rush1[19]]).toEqual([61_000, 80_000]);
    expect(within(80_000, 150_000)[0]).toBe(84_000);
    expect(within(150_000, 175_000)).toHaveLength(33);
    expect(within(150_000, 175_000)[1] - within(150_000, 175_000)[0]).toBe(750);
    expect(within(240_000, 270_000)).toHaveLength(50);
  });

  it('serves every arrival exactly once over a whole session', () => {
    const events = advanceTo(createState(ch), ch, 300_000);
    expect(arrivals(events).map((e) => e.elapsedMs)).toEqual(times);
    expect(events[events.length - 1]).toMatchObject({ event: 'session_end', elapsedMs: 300_000 });
  });

  it('yields the same log from one huge advance as from 17 ms frames', () => {
    const huge = advanceTo(createState(ch), ch, 10_000_000);
    const framed = createState(ch);
    const frameSteps: EconomyEvent[] = [];
    for (let t = 17; !framed.finished; t += 17) frameSteps.push(...advanceTo(framed, ch, t));
    expect(frameSteps).toEqual(huge);
  });

  it('counts down to the next rush and through the current one', () => {
    expect(rushStatus(ch, 50_000)).toEqual({ active: false, msLeft: 10_000 });
    expect(rushStatus(ch, 70_000)).toEqual({ active: true, msLeft: 10_000 });
    expect(rushStatus(ch, 80_000)).toEqual({ active: true, msLeft: 0 });
    expect(rushStatus(ch, 90_000)).toEqual({ active: false, msLeft: 60_000 });
    expect(rushStatus(ch, 280_000)).toBeNull();
  });
});

describe('restock cooldown', () => {
  it('blocks the next restock for restockCooldown seconds', () => {
    const state = chState({ stock: 0, coins: 100, elapsedMs: 10_000, nextCustomerAt: 12_000 });
    expect(restock(state, ch)).toMatchObject({ event: 'restock', stock: 5, coins: 90 });
    expect(state.restockReadyAt).toBe(15_000);
    expect(canRestock(state, ch)).toEqual({ ok: false, reason: 'cooldown' });
    expect(restock(state, ch)).toBeNull();
    advanceTo(state, ch, 14_999);
    expect(canRestock(state, ch)).toEqual({ ok: false, reason: 'cooldown' });
    advanceTo(state, ch, 15_000);
    expect(canRestock(state, ch)).toEqual({ ok: true });
  });

  it('reports need_slots, then need_coins, before the cooldown', () => {
    const cooling = { elapsedMs: 10_000, restockReadyAt: 20_000 };
    expect(canRestock(chState({ ...cooling, stock: 16, coins: 5 }), ch)).toEqual({ ok: false, reason: 'need_slots' });
    expect(canRestock(chState({ ...cooling, stock: 0, coins: 5 }), ch)).toEqual({ ok: false, reason: 'need_coins' });
    expect(canRestock(chState({ ...cooling, stock: 0, coins: 50 }), ch)).toEqual({ ok: false, reason: 'cooldown' });
  });
});

describe('Bigger Crates', () => {
  it('crate size = restockBatch + cratesBatchStep * L; cost = round(cratesBaseCost * cratesCostGrowth ^ L)', () => {
    expect([0, 1, 2, 3].map((l) => batchAt(ch, l))).toEqual([5, 8, 11, 14]);
    expect([0, 1, 2].map((l) => cratesCostAt(ch, l))).toEqual([40, 60, 90]);
  });

  it('buys a level without changing the price; the next crate is bigger', () => {
    const state = chState({ coins: 100, stock: 2 });
    expect(upgradeCrates(state, ch)).toEqual({
      elapsedMs: 0,
      event: 'crates_upgrade',
      amount: -40,
      coins: 60,
      stock: 2,
      upgradeLevel: 0,
      price: 5,
      cratesLevel: 1,
    });
    expect(restock(state, ch)).toMatchObject({ amount: -10, coins: 50, stock: 10, cratesLevel: 1 });
  });

  it('needs free slots for the current crate size', () => {
    expect(canRestock(chState({ cratesLevel: 3, stock: 7, coins: 50 }), ch)).toEqual({ ok: false, reason: 'need_slots' });
    expect(canRestock(chState({ cratesLevel: 3, stock: 6, coins: 50 }), ch)).toEqual({ ok: true });
  });

  it('stops at cratesMaxLevel', () => {
    const state = chState({ cratesLevel: 3, coins: 10_000 });
    expect(canUpgradeCrates(state, ch)).toEqual({ ok: false, reason: 'max_level' });
    expect(upgradeCrates(state, ch)).toBeNull();
  });

  it('is guarded like Better Brews, at the unchanged price', () => {
    expect(canUpgradeCrates(chState({ stock: 0, coins: 39 }), ch)).toEqual({ ok: false, reason: 'need_coins' });
    expect(canUpgradeCrates(chState({ stock: 0, coins: 45 }), ch)).toEqual({ ok: false, reason: 'dead_shop_guard' });
    expect(cratesSafeAt(chState({ stock: 0 }), ch)).toBe(50);
    expect(canUpgradeCrates(chState({ stock: 0, coins: 50 }), ch)).toEqual({ ok: true });
    expect(cratesSafeAt(chState({ stock: 1 }), ch)).toBe(45);
    expect(canUpgradeCrates(chState({ stock: 1, coins: 45 }), ch)).toEqual({ ok: true });
  });

  it('never allows a Crates upgrade after which selling out cannot fund a restock', () => {
    for (let level = 0; level < ch.cratesMaxLevel; level++) {
      for (let stock = 0; stock <= ch.shelfCap; stock++) {
        for (let coins = 0; coins <= 200; coins++) {
          const state = chState({ stock, coins, cratesLevel: level, upgradeLevel: 1 });
          if (!canUpgradeCrates(state, ch).ok) continue;
          upgradeCrates(state, ch);
          expect(state.coins + state.stock * priceAt(ch, state.upgradeLevel)).toBeGreaterThanOrEqual(ch.restockCost);
        }
      }
    }
  });
});

describe('summary', () => {
  it('splits upgrade spend and reports profit = closing - startCoins', () => {
    const state = chState({ coins: 200, stock: 0 });
    const events = [upgradeCrates(state, ch)!, upgrade(state, ch)!, ...advanceTo(state, ch, 300_000)];
    expect(summarize(ch, events)).toMatchObject({
      brewsSpend: 50,
      cratesSpend: 40,
      upgradeSpend: 90,
      closing: 110,
      profit: 90,
      upgradeLevel: 1,
      cratesLevel: 1,
      sold: 0,
      missed: 158,
      rushes: [
        { served: 0, missed: 20 },
        { served: 0, missed: 33 },
        { served: 0, missed: 50 },
      ],
    });
  });

  it('counts served and missed customers per rush', () => {
    const state = chState({ stock: 20 });
    const events = advanceTo(state, ch, 75_000); // 15 calm sales, then the rush sells out after 5
    expect(summarize(ch, events).rushes[0]).toEqual({ served: 5, missed: 10 });
  });
});
