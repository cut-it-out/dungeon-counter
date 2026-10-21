import { describe, expect, it } from 'vitest';
import challenge from '../src/config/challenge-v1.json';
import type { EconomyConfig } from '../src/config/types';
import { csvFilename, toCsv } from '../src/csv/export';
import { summarize } from '../src/economy/economy';
import { runSession } from '../src/economy/runSession';
import { CSV_COLUMNS, type RunLog } from '../src/log/eventLog';

const cfg = challenge as EconomyConfig;

// Hand-made fixture: start, sale, restock, upgrade, sale, missed sale, end.
const fixture: RunLog = {
  runId: 'run-7f12',
  runType: 'played',
  configId: 'challenge-v1',
  events: [
    { elapsedMs: 0, event: 'session_start', amount: 0, coins: 20, stock: 1, upgradeLevel: 0, price: 5, cratesLevel: 0 },
    { elapsedMs: 3000, event: 'sale', amount: 5, coins: 25, stock: 0, upgradeLevel: 0, price: 5, cratesLevel: 0 },
    { elapsedMs: 4250, event: 'restock', amount: -10, coins: 15, stock: 5, upgradeLevel: 0, price: 5, cratesLevel: 0 },
    { elapsedMs: 4900, event: 'resume', amount: 0, coins: 15, stock: 5, upgradeLevel: 0, price: 5, cratesLevel: 0 },
    { elapsedMs: 6000, event: 'sale', amount: 5, coins: 20, stock: 4, upgradeLevel: 0, price: 5, cratesLevel: 0 },
    { elapsedMs: 9000, event: 'sale', amount: 5, coins: 25, stock: 3, upgradeLevel: 0, price: 5, cratesLevel: 0 },
    { elapsedMs: 300000, event: 'session_end', amount: 0, coins: 25, stock: 3, upgradeLevel: 0, price: 5, cratesLevel: 0 },
  ],
};

const parse = (csv: string) => {
  const [header, ...rows] = csv.trimEnd().split('\n');
  const cols = header.split(',');
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v])));
};

describe('CSV export', () => {
  it('writes the fixture as an exact string', () => {
    expect(toCsv(fixture)).toBe(
      [
        'run_id,run_type,config_id,elapsed_s,event,amount,coins,stock,upgrade_level,price,crate_level',
        'run-7f12,played,challenge-v1,0.0,session_start,0,20,1,0,5,0',
        'run-7f12,played,challenge-v1,3.0,sale,5,25,0,0,5,0',
        'run-7f12,played,challenge-v1,4.3,restock,-10,15,5,0,5,0',
        'run-7f12,played,challenge-v1,4.9,resume,0,15,5,0,5,0',
        'run-7f12,played,challenge-v1,6.0,sale,5,20,4,0,5,0',
        'run-7f12,played,challenge-v1,9.0,sale,5,25,3,0,5,0',
        'run-7f12,played,challenge-v1,300.0,session_end,0,25,3,0,5,0',
        '',
      ].join('\n'),
    );
  });

  it('reconciles from the CSV alone: start coins + sum(amount) = last coins; sum(sale) = revenue', () => {
    const rows = parse(toCsv(fixture));
    const total = rows.reduce((s, r) => s + Number(r.amount), 0);
    expect(Number(rows[0].coins) + total).toBe(Number(rows[rows.length - 1].coins));
    const sales = rows.filter((r) => r.event === 'sale').reduce((s, r) => s + Number(r.amount), 0);
    expect(sales).toBe(summarize(cfg, fixture.events).revenue);
  });

  it('reconciles a full policy session with every row in the 11 columns', () => {
    const { events } = runSession(cfg);
    const run: RunLog = { runId: 'run-0001', runType: 'simulated', configId: cfg.id, events };
    const csv = toCsv(run);
    expect(csv.trimEnd().split('\n').every((line) => line.split(',').length === CSV_COLUMNS.length)).toBe(true);
    const rows = parse(csv);
    const total = rows.reduce((s, r) => s + Number(r.amount), 0);
    expect(cfg.startCoins + total).toBe(Number(rows[rows.length - 1].coins));
  });

  it('names the file dungeon-counter_<config_id>_<run_type>_<YYYYMMDD-HHMM>.csv in local time', () => {
    expect(csvFilename(fixture, new Date(2026, 9, 20, 19, 45))).toBe('dungeon-counter_challenge-v1_played_20261020-1945.csv');
    expect(csvFilename(fixture, new Date(2026, 0, 2, 3, 4))).toBe('dungeon-counter_challenge-v1_played_20260102-0304.csv');
  });
});
