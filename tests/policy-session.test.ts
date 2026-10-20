import { describe, expect, it } from 'vitest';
import type { EconomyConfig } from '../src/config/types';
import { validateConfig } from '../src/config/validate';
import { canRestock, canUpgrade, createState, priceAt, sessionMs, summarize } from '../src/economy/economy';
import { runSession } from '../src/economy/runSession';
import type { EconomyEvent, EconomyState } from '../src/economy/types';

// Every config file in src/config/, so revised-v1 is checked as soon as it exists.
const modules = import.meta.glob<{ default: EconomyConfig }>('../src/config/*.json', { eager: true });
const configs = Object.values(modules).map((m) => m.default);

const stateAt = (e: EconomyEvent): EconomyState => ({
  coins: e.coins,
  stock: e.stock,
  upgradeLevel: e.upgradeLevel,
  elapsedMs: e.elapsedMs,
  nextCustomerAt: 0,
  finished: false,
});

// Idle = time during which neither Restock nor Upgrade is available (GDD §6).
function idleMs(cfg: EconomyConfig, events: EconomyEvent[]): number {
  const start = createState(cfg);
  const rows = [{ t: 0, state: start }, ...events.map((e) => ({ t: e.elapsedMs, state: stateAt(e) }))];
  let idle = 0;
  for (let i = 0; i < rows.length - 1; i++) {
    const { state } = rows[i];
    if (!canRestock(state, cfg).ok && !canUpgrade(state, cfg).ok) idle += rows[i + 1].t - rows[i].t;
  }
  return idle;
}

describe('full-session policy run', () => {
  it('finds at least the baseline config', () => {
    expect(configs.map((c) => c.id)).toContain('baseline-v1');
  });

  describe.each(configs.map((c) => [c.id, c] as const))('%s', (_id, cfg) => {
    validateConfig(cfg);
    const { state, events } = runSession(cfg);
    const summary = summarize(cfg, events);

    it('ends with session_end at the session length', () => {
      expect(state.finished).toBe(true);
      expect(events[events.length - 1]).toMatchObject({ event: 'session_end', elapsedMs: sessionMs(cfg) });
    });

    it('serves every scheduled arrival exactly once', () => {
      const expected = Math.floor(cfg.sessionSeconds / cfg.customerInterval);
      expect(summary.sold + summary.missed).toBe(expected);
    });

    it('reconciles: end coins = startCoins + sum(amount); sum(sale) = revenue', () => {
      const total = events.reduce((s, e) => s + e.amount, 0);
      expect(state.coins).toBe(cfg.startCoins + total);
      expect(summary.closing).toBe(state.coins);
      expect(summary.closing).toBe(cfg.startCoins + summary.revenue - summary.restockSpend - summary.upgradeSpend);
      const independentRevenue = events
        .filter((e) => e.event === 'sale')
        .reduce((s, e) => s + priceAt(cfg, e.upgradeLevel), 0);
      expect(summary.revenue).toBe(independentRevenue);
    });

    it('never reaches a dead shop (stock 0 and coins < restockCost)', () => {
      const dead = events.filter((e) => e.stock === 0 && e.coins < cfg.restockCost);
      expect(dead).toEqual([]);
    });

    it('reports first-upgrade time, idle time, missed sales and closing balance (sanity check, not evidence)', () => {
      const first = events.find((e) => e.event === 'upgrade');
      const firstText = first ? `${first.elapsedMs / 1000}s` : 'N/A';
      console.log(
        `${cfg.id}: first upgrade ${firstText}, idle ${idleMs(cfg, events) / 1000}s, ` +
          `missed ${summary.missed}, close ${summary.closing}c, level ${summary.upgradeLevel}, revenue ${summary.revenue}c`,
      );
      expect(true).toBe(true);
    });
  });
});
