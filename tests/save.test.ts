import { describe, expect, it } from 'vitest';
import challenge from '../src/config/challenge-v1.json';
import type { EconomyConfig } from '../src/config/types';
import { advanceTo, createState, restock } from '../src/economy/economy';
import { markerEvent, newRun } from '../src/log/eventLog';
import {
  bestKey,
  clearSave,
  readBest,
  readSave,
  recordBest,
  runFromSave,
  saveKey,
  stateFromSave,
  toSave,
  writeSave,
  type StorageLike,
} from '../src/storage/save';

const cfg = challenge as EconomyConfig;

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

// A run part-way through: start, arrivals to 130 s (into the first calm stretch after rush 1), one restock.
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
    expect(saveKey('challenge-v1')).toBe('dungeon-counter-save:v2:challenge-v1');
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
    expect(readSave(storage, 'challenge-v2')).toEqual({ save: null, malformed: false });
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
    run.events.push(...advanceTo(state, cfg, 8000)); // arrivals at 4 s and 8 s
    writeSave(storage, toSave(state, run));

    const resumed = stateFromSave(readSave(storage, cfg.id).save!);
    expect(advanceTo(resumed, cfg, 8000)).toEqual([]);
    expect(advanceTo(resumed, cfg, 12000).map((e) => e.elapsedMs)).toEqual([12000]);
  });

  it('clears the save', () => {
    const storage = memoryStorage();
    const { state, run } = midRun();
    writeSave(storage, toSave(state, run));
    expect(clearSave(storage, cfg.id)).toBe(true);
    expect(storage.data.size).toBe(0);
  });
});

describe('personal best', () => {
  it('uses its own per-config key', () => {
    expect(bestKey('challenge-v1')).toBe('dungeon-counter-best:v1:challenge-v1');
    expect(bestKey('challenge-v1')).not.toBe(saveKey('challenge-v1'));
  });

  it('records the first finished run as the best', () => {
    const storage = memoryStorage();
    expect(readBest(storage, cfg.id)).toBeNull();
    expect(recordBest(storage, cfg.id, 'run-0001', 300)).toEqual({ best: { profit: 300, runId: 'run-0001' }, isNew: true });
    expect(readBest(storage, cfg.id)).toEqual({ profit: 300, runId: 'run-0001' });
  });

  it('replaces it only with a higher profit', () => {
    const storage = memoryStorage();
    recordBest(storage, cfg.id, 'run-0001', 300);
    expect(recordBest(storage, cfg.id, 'run-0002', 250)).toEqual({ best: { profit: 300, runId: 'run-0001' }, isNew: false });
    expect(recordBest(storage, cfg.id, 'run-0003', 300).isNew).toBe(false);
    expect(recordBest(storage, cfg.id, 'run-0004', 301)).toEqual({ best: { profit: 301, runId: 'run-0004' }, isNew: true });
  });

  it('still says new best when the record run is shown again', () => {
    const storage = memoryStorage();
    recordBest(storage, cfg.id, 'run-0001', 300);
    expect(recordBest(storage, cfg.id, 'run-0001', 300)).toEqual({ best: { profit: 300, runId: 'run-0001' }, isNew: true });
  });

  it('survives clearing the run save', () => {
    const storage = memoryStorage();
    recordBest(storage, cfg.id, 'run-0001', 300);
    clearSave(storage, cfg.id);
    expect(readBest(storage, cfg.id)).toEqual({ profit: 300, runId: 'run-0001' });
  });

  it('ignores malformed data and blocked storage', () => {
    const storage = memoryStorage();
    storage.setItem(bestKey(cfg.id), '{"profit":"lots"}');
    expect(readBest(storage, cfg.id)).toBeNull();
    expect(readBest(throwing, cfg.id)).toBeNull();
    expect(recordBest(throwing, cfg.id, 'run-0001', 10)).toEqual({ best: { profit: 10, runId: 'run-0001' }, isNew: true });
  });
});
