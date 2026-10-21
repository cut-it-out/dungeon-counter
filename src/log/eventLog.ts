import type { EconomyConfig } from '../config/types';
import { priceAt } from '../economy/economy';
import type { EconomyEvent, EconomyEventType, EconomyState } from '../economy/types';

// Run columns around the economy's events (GDD §9). One run = one CSV. run_id is an
// anonymous per-run label to separate CSVs in SQL, not a user or device id.

export type RunType = 'played' | 'simulated';

// session_start / resume are markers added here, never by the economy. They carry the full
// state with amount 0, so the SQL interval metrics need no special cases.
export type LogEventType = EconomyEventType | 'session_start' | 'resume';
export type LogEvent = Omit<EconomyEvent, 'event'> & { event: LogEventType };

export interface RunLog {
  runId: string;
  runType: RunType;
  configId: string;
  events: LogEvent[];
}

// Exact CSV header order (GDD §9).
export const CSV_COLUMNS = [
  'run_id',
  'run_type',
  'config_id',
  'elapsed_s',
  'event',
  'amount',
  'coins',
  'stock',
  'upgrade_level',
  'price',
] as const;

export const newRunId = (random: () => number = Math.random) =>
  `run-${Math.floor(random() * 0x10000)
    .toString(16)
    .padStart(4, '0')}`;

export function newRun(cfg: EconomyConfig, runType: RunType = 'played'): RunLog {
  return { runId: newRunId(), runType, configId: cfg.id, events: [] };
}

export function markerEvent(state: EconomyState, cfg: EconomyConfig, event: 'session_start' | 'resume'): LogEvent {
  return {
    elapsedMs: state.elapsedMs,
    event,
    amount: 0,
    coins: state.coins,
    stock: state.stock,
    upgradeLevel: state.upgradeLevel,
    price: priceAt(cfg, state.upgradeLevel),
  };
}

// One CSV row in CSV_COLUMNS order; elapsed_s is game seconds with one decimal.
export const toRow = (run: RunLog, e: LogEvent): (string | number)[] => [
  run.runId,
  run.runType,
  run.configId,
  (e.elapsedMs / 1000).toFixed(1),
  e.event,
  e.amount,
  e.coins,
  e.stock,
  e.upgradeLevel,
  e.price,
];
