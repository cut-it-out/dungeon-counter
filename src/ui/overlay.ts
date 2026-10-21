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
  for (const id of ['title-panel', 'pause-panel', 'confirm-panel', 'summary-panel']) el(id).hidden = id !== panelId;
}

// Title (GDD §3): Continue for an unfinished save, Last summary / Export for a finished one.
// A null handler hides its button.
export function showTitle(opts: {
  configId: string;
  notice: string | null;
  onContinue: (() => void) | null;
  onLastSummary: (() => void) | null;
  onNewDay: () => void;
}) {
  showOnly('title-panel');
  el('pause-btn').hidden = true;
  setText(el('title-config'), `Config: ${opts.configId}`);
  el('title-notice').hidden = !opts.notice;
  setText(el('title-notice'), opts.notice ?? '');
  for (const [id, handler] of [
    ['continue-btn', opts.onContinue],
    ['last-summary-btn', opts.onLastSummary],
  ] as const) {
    el(id).hidden = !handler;
    el(id).onclick = handler;
  }
  // New day is the primary button only when there is nothing to continue or review.
  el('new-day-btn').classList.toggle('primary', !opts.onContinue && !opts.onLastSummary);
  el('new-day-btn').onclick = opts.onNewDay;
}

// Confirm before a destructive action; "Back" is the safe, primary choice.
export function confirm(text: string, yesLabel: string, onYes: () => void, onNo: () => void) {
  showOnly('confirm-panel');
  setText(el('confirm-text'), text);
  setText(el('confirm-yes-btn'), yesLabel);
  el('confirm-yes-btn').onclick = onYes;
  el('confirm-no-btn').onclick = onNo;
}

// Driven by the actual write result; never claims "Saved" after a failed write (GDD §8).
export function setSaveStatus(saved: boolean | null) {
  const node = el('save-status');
  setText(node, saved === null ? '' : saved ? '✓ Saved' : 'Not saved');
  node.classList.toggle('failed', saved === false);
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

export function showPause(
  configId: string,
  handlers: { onResume: () => void; onExport: () => void; onReset: () => void },
) {
  showOnly('pause-panel');
  setText(el('pause-config'), `Config: ${configId}`);
  el('pause-menu').hidden = false;
  el('reset-confirm').hidden = true;
  el('resume-btn').onclick = handlers.onResume;
  el('pause-export-btn').onclick = handlers.onExport;
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

export function showSummary(summary: SessionSummary, handlers: { onExport: () => void; onNewDay: () => void }) {
  showOnly('summary-panel');
  el('pause-btn').hidden = true;
  setText(el('sum-revenue'), `${summary.revenue}c`);
  setText(el('sum-restock'), `−${summary.restockSpend}c`);
  setText(el('sum-upgrade'), `−${summary.upgradeSpend}c`);
  setText(el('sum-sold'), `${summary.sold}`);
  setText(el('sum-missed'), `${summary.missed}`);
  setText(el('sum-level'), `${summary.upgradeLevel}`);
  setText(el('sum-closing'), `${summary.closing}c`);
  el('summary-export-btn').onclick = handlers.onExport;
  el('summary-new-day-btn').onclick = handlers.onNewDay;
}
