import type { EconomyConfig } from '../config/types';
import { canRestock, canUpgrade } from './economy';
import type { EconomyState } from './types';

export type PolicyAction = 'restock' | 'upgrade' | 'wait';

// GDD §6 manual play policy, also used for played evidence runs:
// restock when stock is down to 1 (or 0) and affordable; otherwise upgrade as soon as the
// guard allows; otherwise wait. Restock is checked first when both are possible.
export function decide(state: EconomyState, cfg: EconomyConfig): PolicyAction {
  if (state.stock <= 1 && canRestock(state, cfg).ok) return 'restock';
  if (canUpgrade(state, cfg).ok) return 'upgrade';
  return 'wait';
}
