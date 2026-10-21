import Phaser from 'phaser';
import type { EconomyConfig } from '../config/types';
import { exportCsv } from '../csv/export';
import { summarize } from '../economy/economy';
import type { RunLog } from '../log/eventLog';
import { browserStorage, recordBest } from '../storage/save';
import * as overlay from '../ui/overlay';

// Thin scene: the summary panel is DOM (overlay); this derives the numbers from the run's
// log and routes to the next day.
export class SummaryScene extends Phaser.Scene {
  constructor() {
    super('Summary');
  }

  create(data: { run: RunLog }) {
    const cfg = this.registry.get('config') as EconomyConfig;
    const summary = summarize(cfg, data.run.events);
    // Idempotent, so Last summary can show the same run again (Session 6).
    const best = recordBest(browserStorage(), cfg.id, data.run.runId, summary.profit);
    const show = () =>
      overlay.showSummary(summary, best, {
        onExport: () => void exportCsv(data.run),
        // The finished log stays saved until replaced (GDD §8), so New day confirms.
        onNewDay: () =>
          overlay.confirm(
            'Start a new day? This day’s log will be replaced. Export it first to keep it.',
            'New day',
            () => this.scene.start('Play', {}), // explicit {}: Phaser would reuse a stale resume
            show,
          ),
      });
    show();
  }
}
