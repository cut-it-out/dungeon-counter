import { describe, expect, it } from 'vitest';
import baseline from '../src/config/baseline-v1.json';
import type { EconomyConfig } from '../src/config/types';
import { createState } from '../src/economy/economy';
import { CSV_COLUMNS, markerEvent, newRun, newRunId, toRow } from '../src/log/eventLog';

const cfg = baseline as EconomyConfig;

describe('event log wrapper', () => {
  it('has the exact GDD §9 header order', () => {
    expect(CSV_COLUMNS.join(',')).toBe('run_id,run_type,config_id,elapsed_s,event,amount,coins,stock,upgrade_level,price');
  });

  it('makes run ids of the form run- + 4 hex', () => {
    expect(newRunId(() => 0)).toBe('run-0000');
    expect(newRunId(() => 0.99999)).toBe('run-ffff');
    expect(newRunId()).toMatch(/^run-[0-9a-f]{4}$/);
  });

  it('starts a played run for the config with no rows', () => {
    const run = newRun(cfg);
    expect(run).toMatchObject({ runType: 'played', configId: 'baseline-v1', events: [] });
  });

  it('records session_start with the starting state and amount 0', () => {
    const start = markerEvent(createState(cfg), cfg, 'session_start');
    expect(start).toEqual({ elapsedMs: 0, event: 'session_start', amount: 0, coins: 20, stock: 5, upgradeLevel: 0, price: 5 });
  });

  it('records resume with the current state and amount 0', () => {
    const state = { ...createState(cfg), elapsedMs: 130000, coins: 77, stock: 3, upgradeLevel: 2 };
    expect(markerEvent(state, cfg, 'resume')).toEqual({
      elapsedMs: 130000,
      event: 'resume',
      amount: 0,
      coins: 77,
      stock: 3,
      upgradeLevel: 2,
      price: 9,
    });
  });

  it('writes a row in header order with elapsed_s to one decimal', () => {
    const run = { runId: 'run-7f12', runType: 'played' as const, configId: 'baseline-v1', events: [] };
    const sale = { elapsedMs: 42000, event: 'sale' as const, amount: 7, coins: 135, stock: 6, upgradeLevel: 1, price: 7 };
    expect(toRow(run, sale).join(',')).toBe('run-7f12,played,baseline-v1,42.0,sale,7,135,6,1,7');
  });
});
