import Phaser from 'phaser';

class EmptyScene extends Phaser.Scene {
  constructor() {
    super('Empty');
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'scene',
  width: 390,
  height: 844,
  backgroundColor: '#222836',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [EmptyScene],
});
