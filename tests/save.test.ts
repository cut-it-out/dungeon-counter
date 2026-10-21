import { describe, expect, it } from 'vitest';
import baseline from '../src/config/baseline-v1.json';
import type { EconomyConfig } from '../src/config/types';
import { advanceTo, createState, restock } from '../src/economy/economy';
import { markerEvent, newRun } from '../src/log/eventLog';
import {
  clearSave,
  readSave,
  runFromSave,
  saveKey,
  stateFromSave,
  toSave,
  writeSave,
  type StorageLike,
} from '../src/storage/save';

const cfg = baseline as EconomyConfig;

// In-memory stand-in for localStorage (Vitest runs in node).
function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const throwing: StorageLike = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

// A run part-way through: start, 43 arrivals to 130 s, one restock.
function midRun() {
  const state = createState(cfg);
  const run = newRun(cfg);
  run.events.push(markerEvent(state, cfg, 'session_start'));
  run.events.push(...advanceTo(state, cfg, 130000));
  const r = restock(state, cfg);
  if (r) run.events.push(r);
  return { state, run };
}

describe('save / resume', () => {
  it('uses a versioned per-config key', () => {
    expect(saveKey('baseline-v1')).toBe('dungeon-counter-save:v1:baseline-v1');
  });

  it('round-trips state and events', () => {
    const storage = memoryStorage();
    const { state, run } = midRun();
    expect(writeSave(storage, toSave(state, run))).toBe(true);

    const loaded = readSave(storage, cfg.id);
    expect(loaded.malformed).toBe(false);
    expect(loaded.save).not.toBeNull();
    expect(stateFromSave(loaded.save!)).toEqual(state);
    expect(runFromSave(loaded.save!)).toEqual(run);
  });

  it('keeps configs apart', () => {
    const storage = memoryStorage();
    const { state, run } = midRun();
    writeSave(storage, toSave(state, run));
    expect(readSave(storage, 'revised-v1')).toEqual({ save: null, malformed: false });
  });

  it('returns no save when nothing is stored', () => {
    expect(readSave(memoryStorage(), cfg.id)).toEqual({ save: null, malformed: false });
  });

  it('treats malformed JSON as no save, flagged malformed', () => {
    const storage = memoryStorage();
    storage.setItem(saveKey(cfg.id), '{not json');
    expect(readSave(storage, cfg.id)).toEqual({ save: null, malformed: true });
  });

  it('treats a wrong schema or shape as malformed', () => {
    const storage = memoryStorage();
    const { state, run } = midRun();
    storage.setItem(saveKey(cfg.id), JSON.stringify({ ...toSave(state, run), schemaVersion: 99 }));
    expect(readSave(storage, cfg.id).malformed).toBe(true);
    storage.setItem(saveKey(cfg.id), JSON.stringify({ ...toSave(state, run), coins: '12' }));
    expect(readSave(storage, cfg.id).malformed).toBe(true);
  });

  it('reports Not saved when storage throws, without throwing itself', () => {
    const { state, run } = midRun();
    expect(writeSave(throwing, toSave(state, run))).toBe(false);
    expect(writeSave(null, toSave(state, run))).toBe(false);
    expect(readSave(throwing, cfg.id)).toEqual({ save: null, malformed: false });
    expect(clearSave(throwing, cfg.id)).toBe(false);
    // The game continues: the in-memory state still advances and records events.
    expect(advanceTo(state, cfg, 140000).length).toBeGreaterThan(0);
  });

  it('a resumed state does not replay the arrival it was saved after', () => {
    const storage = memoryStorage();
    const state = createState(cfg);
    const run = newRun(cfg);
    run.events.push(...advanceTo(state, cfg, 6000)); // arrivals at 3 s and 6 s
    writeSave(storage, toSave(state, run));

    const resumed = stateFromSave(readSave(storage, cfg.id).save!);
    expect(advanceTo(resumed, cfg, 6000)).toEqual([]);
    expect(advanceTo(resumed, cfg, 9000).map((e) => e.elapsedMs)).toEqual([9000]);
  });

  it('clears the save', () => {
    const storage = memoryStorage();
    const { state, run } = midRun();
    writeSave(storage, toSave(state, run));
    expect(clearSave(storage, cfg.id)).toBe(true);
    expect(storage.data.size).toBe(0);
  });
});
