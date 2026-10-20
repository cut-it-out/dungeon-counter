import Phaser from 'phaser';
import type { SessionSummary } from '../economy/economy';
import * as overlay from '../ui/overlay';

// Thin scene: the summary panel is DOM (overlay); this only routes to the next day.
export class SummaryScene extends Phaser.Scene {
  constructor() {
    super('Summary');
  }

  create(data: { summary: SessionSummary }) {
    overlay.showSummary(data.summary, () => this.scene.start('Play'));
  }
}
