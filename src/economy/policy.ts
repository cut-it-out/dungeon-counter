import type { EconomyConfig } from '../config/types';
import {
  arrivalTimes,
  canRestock,
  canUpgrade,
  canUpgradeCrates,
  cratesCostAt,
  sessionMs,
  upgradeCostAt,
} from './economy';
import type { EconomyState } from './types';

export type PolicyAction = 'restock' | 'upgrade' | 'crates_upgrade' | 'wait';

// Scripted strategies for the headless dominance check (Session 6). Not playtests: if one of them
// always wins on a config, the Brews-vs-Crates choice on that config is fake.
export const STRATEGIES = ['none', 'brews-only', 'crates-first', 'cheaper-first'] as const;
export type Strategy = (typeof STRATEGIES)[number];

// Shared by every strategy so the comparison measures the upgrade choice, not end-game waste:
// under net profit an upgrade bought near the end cannot pay for itself. Claude's call, Session 7.
export const UPGRADE_HORIZON_S = 60;

const remainingArrivals = (state: EconomyState, cfg: EconomyConfig) =>
  arrivalTimes(cfg).filter((t) => t > state.elapsedMs).length;

// Every strategy restocks whenever it can while the shelf won't cover the customers still to
// come (a full shelf is what a rush needs); otherwise it upgrades by its own rule; otherwise waits.
export function decide(state: EconomyState, cfg: EconomyConfig, strategy: Strategy): PolicyAction {
  if (canRestock(state, cfg).ok && state.stock < remainingArrivals(state, cfg)) return 'restock';
  if (sessionMs(cfg) - state.elapsedMs <= UPGRADE_HORIZON_S * 1000) return 'wait';

  const brews = canUpgrade(state, cfg).ok;
  const crates = canUpgradeCrates(state, cfg).ok;
  switch (strategy) {
    case 'none':
      return 'wait';
    case 'brews-only':
      return brews ? 'upgrade' : 'wait';
    case 'crates-first':
      // Brews only once Crates is maxed, so coins are not left idle after level 3.
      if (state.cratesLevel < cfg.cratesMaxLevel) return crates ? 'crates_upgrade' : 'wait';
      return brews ? 'upgrade' : 'wait';
    case 'cheaper-first': {
      // Waits for the cheaper upgrade instead of buying the other one; ties go to Crates.
      const cratesCheaper =
        state.cratesLevel < cfg.cratesMaxLevel &&
        cratesCostAt(cfg, state.cratesLevel) <= upgradeCostAt(cfg, state.upgradeLevel);
      if (cratesCheaper) return crates ? 'crates_upgrade' : 'wait';
      return brews ? 'upgrade' : 'wait';
    }
  }
}
