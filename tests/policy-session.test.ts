import { describe, expect, it } from 'vitest';
import type { EconomyConfig } from '../src/config/types';
import { validateConfig } from '../src/config/validate';
import {
  arrivalTimes,
  canRestock,
  canUpgrade,
  canUpgradeCrates,
  cooldownMs,
  createState,
  priceAt,
  sessionMs,
  summarize,
} from '../src/economy/economy';
import { STRATEGIES, UPGRADE_HORIZON_S } from '../src/economy/policy';
import { runSession } from '../src/economy/runSession';
import type { EconomyEvent, EconomyState } from '../src/economy/types';

// Every config file in src/config/, so challenge-v2 is checked as soon as it exists.
const modules = import.meta.glob<{ default: EconomyConfig }>('../src/config/*.json', { eager: true });
const configs = Object.values(modules).map((m) => m.default);

const stateAt = (e: EconomyEvent): EconomyState => ({
  coins: e.coins,
  stock: e.stock,
  upgradeLevel: e.upgradeLevel,
  cratesLevel: e.cratesLevel,
  elapsedMs: e.elapsedMs,
  nextCustomerAt: 0,
  restockReadyAt: 0,
  finished: false,
});

// Idle = time during which no action is available (GDD §6). The cooldown ends between rows, so
// an interval is split at the restock's ready time: this is the shape the S13 SQL needs too.
function idleMs(cfg: EconomyConfig, events: EconomyEvent[]): number {
  const rows = [{ event: 'session_start', t: 0, state: createState(cfg) }, ...events.map((e) => ({ event: e.event, t: e.elapsedMs, state: stateAt(e) }))];
  let readyAt = 0;
  let idle = 0;
  for (let i = 0; i < rows.length - 1; i++) {
    const { event, t, state } = rows[i];
    const end = rows[i + 1].t;
    if (event === 'restock') readyAt = t + cooldownMs(cfg);
    if (canUpgrade(state, cfg).ok || canUpgradeCrates(state, cfg).ok) continue;
    if (!canRestock(state, cfg).ok) idle += end - t; // slots or coins block it for the whole interval
    else idle += Math.max(0, Math.min(end, readyAt) - t); // only the cooldown blocks it
  }
  return idle;
}

describe('full-session strategy runs', () => {
  it('finds at least challenge-v1', () => {
    expect(configs.map((c) => c.id)).toContain('challenge-v1');
  });

  describe.each(configs.map((c) => [c.id, c] as const))('%s', (_id, cfg) => {
    validateConfig(cfg);

    describe.each(STRATEGIES.map((s) => [s] as const))('%s', (strategy) => {
      const { state, events } = runSession(cfg, strategy);
      const summary = summarize(cfg, events);

      it('ends with session_end at the session length', () => {
        expect(state.finished).toBe(true);
        expect(events[events.length - 1]).toMatchObject({ event: 'session_end', elapsedMs: sessionMs(cfg) });
      });

      it('serves every scheduled arrival exactly once', () => {
        expect(summary.sold + summary.missed).toBe(arrivalTimes(cfg).length);
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

      it('reports profit, upgrades, idle time and rush service (sanity check, not evidence)', () => {
        const first = events.find((e) => e.event === 'upgrade' || e.event === 'crates_upgrade');
        const rushes = summary.rushes.map((r) => `${r.served}/${r.served + r.missed}`).join(' ');
        console.log(
          `${cfg.id} ${strategy.padEnd(13)} profit ${String(summary.profit).padStart(4)}c | ` +
            `Brews ${summary.upgradeLevel} Crates ${summary.cratesLevel} | first upgrade ${first ? `${first.elapsedMs / 1000}s` : 'N/A'} | ` +
            `missed ${summary.missed} (rushes served ${rushes}) | idle ${idleMs(cfg, events) / 1000}s ` +
            `[assumes no upgrades in the last ${UPGRADE_HORIZON_S}s]`,
        );
        expect(true).toBe(true);
      });
    });
  });
});
