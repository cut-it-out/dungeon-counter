import Phaser from 'phaser';
import type { EconomyConfig } from '../config/types';
import { medalFor } from '../economy/economy';
import { browserStorage, readBest, readSave, runFromSave } from '../storage/save';
import * as overlay from '../ui/overlay';

// Thin scene: the title panel is DOM (overlay); this reads the config's save and routes.
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const cfg = this.registry.get('config') as EconomyConfig;
    const { save, malformed } = readSave(browserStorage(), cfg.id);
    const unfinished = save && !save.finished ? save : null;
    const finished = save && save.finished ? save : null;
    const configNotice = this.registry.get('configNotice') as string | null;
    const best = readBest(browserStorage(), cfg.id);
    const saveNotice = malformed ? 'The saved day could not be read, so a new day starts fresh.' : null;

    // Always pass data: Phaser keeps the previous start's data when none is given.
    const startNew = () => this.scene.start('Play', {});
    overlay.showTitle({
      configId: cfg.id,
      notice: [configNotice, saveNotice].filter(Boolean).join(' ') || null,
      best,
      bestMedal: best ? medalFor(cfg, best.profit) : null,
      onContinue: unfinished ? () => this.scene.start('Play', { resume: unfinished }) : null,
      onLastSummary: finished ? () => this.scene.start('Summary', { run: runFromSave(finished) }) : null,
      // A new day replaces the saved log, so confirm whenever one exists (GDD §3, §8).
      onNewDay: save
        ? () =>
            overlay.confirm(
              unfinished
                ? 'Start a new day? The unfinished day and its log will be replaced.'
                : 'Start a new day? The last day’s log will be replaced. Export it first to keep it.',
              'New day',
              startNew,
              () => this.scene.restart(),
            )
        : startNew,
    });
  }
}
