import type { EconomyConfig } from '../config/types';
import { advanceTo, createState, restock, upgrade } from './economy';
import { decide } from './policy';
import type { EconomyEvent, EconomyState } from './types';

// Headless session: the §6 policy reacts immediately after every arrival (and at t = 0),
// acting until it decides to wait. Not a playtest; a sanity check of the economy.
export function runSession(cfg: EconomyConfig): { state: EconomyState; events: EconomyEvent[] } {
  const state = createState(cfg);
  const events: EconomyEvent[] = [];

  const act = () => {
    for (;;) {
      const action = decide(state, cfg);
      if (action === 'wait') return;
      const event = action === 'restock' ? restock(state, cfg) : upgrade(state, cfg);
      if (!event) return;
      events.push(event);
    }
  };

  act();
  while (!state.finished) {
    events.push(...advanceTo(state, cfg, state.nextCustomerAt));
    act();
  }
  return { state, events };
}
