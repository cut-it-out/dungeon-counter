import Phaser from 'phaser';
import * as overlay from '../ui/overlay';

// Thin scene: the title panel is DOM (overlay); this only routes to Play.
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    overlay.showTitle(() => this.scene.start('Play'));
  }
}
