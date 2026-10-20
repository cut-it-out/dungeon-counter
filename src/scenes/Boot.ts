import Phaser from 'phaser';

// Loads assets (none yet: S5 uses placeholder shapes) and hands over to the title.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.scene.start('Title');
  }
}
