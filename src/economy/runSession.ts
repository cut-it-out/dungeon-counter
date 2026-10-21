import type { EconomyConfig } from '../config/types';
import { advanceTo, createState, restock, upgrade, upgradeCrates } from './economy';
import { decide, type Strategy } from './policy';
import type { EconomyEvent, EconomyState } from './types';

// Headless session: the strategy reacts immediately after every arrival, when the restock
// cooldown ends and at t = 0, acting until it decides to wait. Not a playtest; a sanity check
// of the economy and the dominance check between strategies.
export function runSession(
  cfg: EconomyConfig,
  strategy: Strategy = 'cheaper-first',
): { state: EconomyState; events: EconomyEvent[] } {
  const state = createState(cfg);
  const events: EconomyEvent[] = [];
  const actions = { restock, upgrade, crates_upgrade: upgradeCrates };

  const act = () => {
    for (;;) {
      const action = decide(state, cfg, strategy);
      if (action === 'wait') return;
      const event = actions[action](state, cfg);
      if (!event) return;
      events.push(event);
    }
  };

  act();
  while (!state.finished) {
    const cooling = state.restockReadyAt > state.elapsedMs;
    const target = cooling ? Math.min(state.nextCustomerAt, state.restockReadyAt) : state.nextCustomerAt;
    events.push(...advanceTo(state, cfg, target));
    act();
  }
  return { state, events };
}
