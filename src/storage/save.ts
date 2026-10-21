import type { EconomyState } from '../economy/types';
import type { LogEvent, RunLog } from '../log/eventLog';

// Best-effort per-config save (GDD §8). Every storage call is wrapped: a blocked or full
// storage returns false / null, the game keeps running in memory and shows "Not saved".

export const SCHEMA_VERSION = 2;

export const saveKey = (configId: string) => `dungeon-counter-save:v2:${configId}`;

export interface SaveData {
  schemaVersion: number;
  configId: string;
  runId: string;
  coins: number;
  stock: number;
  upgradeLevel: number;
  cratesLevel: number;
  elapsedMs: number;
  nextCustomerAt: number;
  restockReadyAt: number;
  finished: boolean;
  events: LogEvent[];
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

// Even reading window.localStorage can throw (blocked site data, some private modes).
export function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function toSave(state: EconomyState, run: RunLog): SaveData {
  return {
    schemaVersion: SCHEMA_VERSION,
    configId: run.configId,
    runId: run.runId,
    coins: state.coins,
    stock: state.stock,
    upgradeLevel: state.upgradeLevel,
    cratesLevel: state.cratesLevel,
    elapsedMs: state.elapsedMs,
    nextCustomerAt: state.nextCustomerAt,
    restockReadyAt: state.restockReadyAt,
    finished: state.finished,
    events: run.events,
  };
}

export const stateFromSave = (save: SaveData): EconomyState => ({
  coins: save.coins,
  stock: save.stock,
  upgradeLevel: save.upgradeLevel,
  cratesLevel: save.cratesLevel,
  elapsedMs: save.elapsedMs,
  nextCustomerAt: save.nextCustomerAt,
  restockReadyAt: save.restockReadyAt,
  finished: save.finished,
});

// Saves hold played runs only.
export const runFromSave = (save: SaveData): RunLog => ({
  runId: save.runId,
  runType: 'played',
  configId: save.configId,
  events: save.events,
});

export function writeSave(storage: StorageLike | null, data: SaveData): boolean {
  if (!storage) return false;
  try {
    storage.setItem(saveKey(data.configId), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(storage: StorageLike | null, configId: string): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(saveKey(configId));
    return true;
  } catch {
    return false;
  }
}

const isInt = (v: unknown) => Number.isInteger(v);

function isSaveData(v: unknown, configId: string): v is SaveData {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    s.schemaVersion === SCHEMA_VERSION &&
    s.configId === configId &&
    typeof s.runId === 'string' &&
    [s.coins, s.stock, s.upgradeLevel, s.cratesLevel, s.elapsedMs, s.nextCustomerAt, s.restockReadyAt].every(isInt) &&
    typeof s.finished === 'boolean' &&
    Array.isArray(s.events)
  );
}

// `malformed` means a save exists but can't be used; the title shows a notice and a fresh run starts.
export type LoadResult = { save: SaveData; malformed: false } | { save: null; malformed: boolean };

export function readSave(storage: StorageLike | null, configId: string): LoadResult {
  if (!storage) return { save: null, malformed: false };
  let raw: string | null;
  try {
    raw = storage.getItem(saveKey(configId));
  } catch {
    return { save: null, malformed: false };
  }
  if (raw === null) return { save: null, malformed: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSaveData(parsed, configId) ? { save: parsed, malformed: false } : { save: null, malformed: true };
  } catch {
    return { save: null, malformed: true };
  }
}
