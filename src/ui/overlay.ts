import type { EconomyConfig } from '../config/types';
import {
  batchAt,
  cratesCostAt,
  cratesSafeAt,
  priceAt,
  rushStatus,
  sessionMs,
  upgradeCostAt,
  upgradeSafeAt,
  type SessionSummary,
} from '../economy/economy';
import type { Availability, BlockReason, EconomyState } from '../economy/types';
import type { Best } from '../storage/save';

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

const signed = (coins: number) => `${coins < 0 ? '−' : '+'}${Math.abs(coins)}c`;

// `value` is the action's cost for need_coins, the guard's unlock amount for dead_shop_guard,
// the current crate size for need_slots and whole seconds left for cooldown.
export function reasonText(reason: BlockReason, value: number): string {
  switch (reason) {
    case 'need_coins':
      return `Need ${value}c`;
    case 'need_slots':
      return `Need ${value} free slots`;
    case 'cooldown':
      return `Ready in ${value}s`;
    case 'dead_shop_guard':
      return `Need ${value}c to stay stocked`;
    case 'max_level':
      return 'Max level';
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
  best: Best | null;
  onContinue: (() => void) | null;
  onLastSummary: (() => void) | null;
  onNewDay: () => void;
}) {
  showOnly('title-panel');
  el('pause-btn').hidden = true;
  setText(el('title-config'), `Config: ${opts.configId}`);
  el('title-best').hidden = !opts.best;
  setText(el('title-best'), opts.best ? `Best profit ${signed(opts.best.profit)}` : '');
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

// Driven by the actual write result (GDD §8), but shown only when a write fails (my direction,
// Session 10): a highlighted "Not saved" row the player notices; nothing while saving works.
export function setSaveStatus(saved: boolean | null) {
  const node = el('save-status');
  node.hidden = saved !== false;
  setText(node, saved === false ? 'Not saved' : '');
}

export function showPlay(handlers: {
  onRestock: () => void;
  onUpgrade: () => void;
  onCrates: () => void;
  onPause: () => void;
}) {
  showOnly(null);
  el('pause-btn').hidden = false;
  el('restock-btn').onclick = handlers.onRestock;
  el('upgrade-btn').onclick = handlers.onUpgrade;
  el('crates-btn').onclick = handlers.onCrates;
  el('pause-btn').onclick = handlers.onPause;
}

// Rush countdown beside the timer (Session 6): predictable only if the player can see it coming.
function renderRush(cfg: EconomyConfig, tMs: number) {
  const status = rushStatus(cfg, tMs);
  const node = el('rush');
  node.classList.toggle('active', !!status?.active);
  setText(node, !status ? '' : status.active ? `RUSH! ${formatClock(status.msLeft)}` : `Rush in ${formatClock(status.msLeft)}`);
}

export function renderPlay(
  state: EconomyState,
  cfg: EconomyConfig,
  restock: Availability,
  upgrade: Availability,
  crates: Availability,
) {
  const cost = upgradeCostAt(cfg, state.upgradeLevel);
  setText(el('coins'), `${state.coins}c`);
  setText(el('stock'), `${state.stock}/${cfg.shelfCap}`);
  setText(el('timer'), formatClock(sessionMs(cfg) - state.elapsedMs));
  renderRush(cfg, state.elapsedMs);
  setText(el('upgrade-level'), `Lv ${state.upgradeLevel}`);
  setText(el('upgrade-info'), `Price ${priceAt(cfg, state.upgradeLevel)}c → ${priceAt(cfg, state.upgradeLevel + 1)}c`);
  const batch = batchAt(cfg, state.cratesLevel);
  const maxed = state.cratesLevel >= cfg.cratesMaxLevel;
  const cratesCost = cratesCostAt(cfg, state.cratesLevel);
  setText(el('crates-level'), `Lv ${state.cratesLevel}`);
  setText(el('crates-info'), maxed ? `Crate ${batch} (max)` : `Crate ${batch} → ${batchAt(cfg, state.cratesLevel + 1)}`);
  setText(el('restock-label'), `Restock +${batch}`);
  setText(el('restock-cost'), `${cfg.restockCost}c`);
  setText(el('upgrade-cost'), `${cost}c`);
  setText(el('crates-cost'), maxed ? '—' : `${cratesCost}c`);
  setAction(
    el<HTMLButtonElement>('crates-btn'),
    el('crates-reason'),
    crates,
    crates.ok
      ? ''
      : reasonText(crates.reason, crates.reason === 'dead_shop_guard' ? cratesSafeAt(state, cfg) : cratesCost),
  );
  const restockValue: Record<string, number> = {
    need_coins: cfg.restockCost,
    need_slots: batch,
    cooldown: Math.ceil((state.restockReadyAt - state.elapsedMs) / 1000),
  };
  setAction(
    el<HTMLButtonElement>('restock-btn'),
    el('restock-reason'),
    restock,
    restock.ok ? '' : reasonText(restock.reason, restockValue[restock.reason] ?? 0),
  );
  setAction(
    el<HTMLButtonElement>('upgrade-btn'),
    el('upgrade-reason'),
    upgrade,
    upgrade.ok
      ? ''
      : reasonText(upgrade.reason, upgrade.reason === 'dead_shop_guard' ? upgradeSafeAt(state, cfg) : cost),
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

// End-of-day summary (Session 6): profit is the headline score, compared with the personal best.
export function showSummary(
  summary: SessionSummary,
  best: { best: Best; isNew: boolean },
  handlers: { onExport: () => void; onNewDay: () => void },
) {
  showOnly('summary-panel');
  el('pause-btn').hidden = true;
  setText(el('sum-profit'), signed(summary.profit));
  setText(el('sum-best'), best.isNew ? 'New best!' : `Best ${signed(best.best.profit)}`);
  el('sum-best').classList.toggle('new', best.isNew);
  const spend = (coins: number) => (coins ? `−${coins}c` : '0c');
  setText(el('sum-revenue'), `${summary.revenue}c`);
  setText(el('sum-restock'), spend(summary.restockSpend));
  setText(el('sum-brews'), spend(summary.brewsSpend));
  setText(el('sum-crates'), spend(summary.cratesSpend));
  setText(el('sum-level'), `Lv ${summary.upgradeLevel}`);
  setText(el('sum-crates-level'), `Lv ${summary.cratesLevel}`);
  setText(el('sum-sold'), `${summary.sold}`);
  setText(el('sum-missed'), `${summary.missed}`);
  setText(el('sum-rushes'), summary.rushes.map((r) => `${r.served}/${r.served + r.missed}`).join('  ') || '—');
  setText(el('sum-closing'), `${summary.closing}c`);
  el('summary-export-btn').onclick = handlers.onExport;
  el('summary-new-day-btn').onclick = handlers.onNewDay;
}
