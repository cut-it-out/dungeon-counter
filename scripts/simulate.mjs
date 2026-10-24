// Headless strategy runs as CSVs (plan S18 simulator, pulled forward for S16 in Session 10).
// Writes one run_type=simulated CSV per config x strategy into balancing/simulated/, outside
// balancing/runs/ so played-run reports never include them. Not playtests.
// Usage: node scripts/simulate.mjs
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const OUT = 'balancing/simulated';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const load = (path) => server.ssrLoadModule(path);
  const { CONFIGS } = await load('/src/config/index.ts');
  const { createState } = await load('/src/economy/economy.ts');
  const { STRATEGIES } = await load('/src/economy/policy.ts');
  const { runSession } = await load('/src/economy/runSession.ts');
  const { markerEvent } = await load('/src/log/eventLog.ts');
  const { toCsv } = await load('/src/csv/export.ts');

  mkdirSync(OUT, { recursive: true });
  for (const f of readdirSync(OUT)) if (f.endsWith('.csv')) rmSync(`${OUT}/${f}`);
  for (const cfg of CONFIGS) {
    for (const strategy of STRATEGIES) {
      const { events } = runSession(cfg, strategy);
      const start = markerEvent(createState(cfg), cfg, 'session_start');
      const run = { runId: `sim-${strategy}`, runType: 'simulated', configId: cfg.id, events: [start, ...events] };
      writeFileSync(`${OUT}/dungeon-counter_${cfg.id}_simulated_${strategy}.csv`, toCsv(run));
    }
  }
  console.log(`${CONFIGS.length * STRATEGIES.length} CSVs in ${OUT}/`);
} finally {
  await server.close();
}
