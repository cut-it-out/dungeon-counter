import type { EconomyConfig } from '../config/types';
import { priceAt, sessionMs, upgradeCostAt, upgradeSafeAt, type SessionSummary } from '../economy/economy';
import type { Availability, BlockReason, EconomyState } from '../economy/types';

// DOM overlay (plan decision B): HUD, action buttons, reason text, pause menu, title and summary.
// Elements live in index.html; this module only fills them in and wires click handlers.

const el = <T extends HTMLElement = HTMLElement>(id: string) => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id} in index.html`);
  return node as T;
};

// Write text only when it changed, so per-frame rendering doesn't touch the DOM needlessly.
const setText = (node: HTMLElement, text: string) => {
  if (node.textContent !== text) node.textContent = text;
};

const formatClock = (ms: number) => {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

// `coins` is the action's cost for need_coins and the guard's unlock amount for dead_shop_guard.
export function reasonText(reason: BlockReason, cfg: EconomyConfig, coins: number): string {
  switch (reason) {
    case 'need_coins':
      return `Need ${coins}c`;
    case 'need_slots':
      return `Need ${cfg.restockBatch} free slots`;
    case 'dead_shop_guard':
      return `Need ${coins}c to stay stocked`;
  }
}

function setAction(button: HTMLButtonElement, reasonNode: HTMLElement, avail: Availability, text: string) {
  button.disabled = !avail.ok;
  setText(reasonNode, avail.ok ? '' : text);
}

function showOnly(panelId: string | null) {
  for (const id of ['title-panel', 'pause-panel', 'summary-panel']) el(id).hidden = id !== panelId;
}

export function showTitle(onNewDay: () => void) {
  showOnly('title-panel');
  el('pause-btn').hidden = true;
  el('new-day-btn').onclick = onNewDay;
}

export function showPlay(handlers: { onRestock: () => void; onUpgrade: () => void; onPause: () => void }) {
  showOnly(null);
  el('pause-btn').hidden = false;
  el('restock-btn').onclick = handlers.onRestock;
  el('upgrade-btn').onclick = handlers.onUpgrade;
  el('pause-btn').onclick = handlers.onPause;
}

export function renderPlay(
  state: EconomyState,
  cfg: EconomyConfig,
  restock: Availability,
  upgrade: Availability,
) {
  const cost = upgradeCostAt(cfg, state.upgradeLevel);
  setText(el('coins'), `${state.coins}c`);
  setText(el('stock'), `${state.stock}/${cfg.shelfCap}`);
  setText(el('timer'), formatClock(sessionMs(cfg) - state.elapsedMs));
  setText(el('upgrade-level'), `Lv ${state.upgradeLevel}`);
  setText(
    el('upgrade-info'),
    `Price ${priceAt(cfg, state.upgradeLevel)}c → ${priceAt(cfg, state.upgradeLevel + 1)}c · cost ${cost}c`,
  );
  setText(el('restock-label'), `Restock +${cfg.restockBatch}`);
  setText(el('restock-cost'), `${cfg.restockCost}c`);
  setText(el('upgrade-cost'), `${cost}c`);
  setAction(
    el<HTMLButtonElement>('restock-btn'),
    el('restock-reason'),
    restock,
    restock.ok ? '' : reasonText(restock.reason, cfg, cfg.restockCost),
  );
  setAction(
    el<HTMLButtonElement>('upgrade-btn'),
    el('upgrade-reason'),
    upgrade,
    upgrade.ok
      ? ''
      : reasonText(upgrade.reason, cfg, upgrade.reason === 'dead_shop_guard' ? upgradeSafeAt(state, cfg) : cost),
  );
}

export function showPause(configId: string, handlers: { onResume: () => void; onReset: () => void }) {
  showOnly('pause-panel');
  setText(el('pause-config'), `Config: ${configId}`);
  el('pause-menu').hidden = false;
  el('reset-confirm').hidden = true;
  el('resume-btn').onclick = handlers.onResume;
  el('reset-btn').onclick = () => {
    el('pause-menu').hidden = true;
    el('reset-confirm').hidden = false;
  };
  el('reset-cancel-btn').onclick = handlers.onResume;
  el('reset-yes-btn').onclick = handlers.onReset;
}

export function hidePause() {
  showOnly(null);
}

export function showSummary(summary: SessionSummary, onNewDay: () => void) {
  showOnly('summary-panel');
  el('pause-btn').hidden = true;
  setText(el('sum-revenue'), `${summary.revenue}c`);
  setText(el('sum-restock'), `−${summary.restockSpend}c`);
  setText(el('sum-upgrade'), `−${summary.upgradeSpend}c`);
  setText(el('sum-sold'), `${summary.sold}`);
  setText(el('sum-missed'), `${summary.missed}`);
  setText(el('sum-level'), `${summary.upgradeLevel}`);
  setText(el('sum-closing'), `${summary.closing}c`);
  el('summary-new-day-btn').onclick = onNewDay;
}
