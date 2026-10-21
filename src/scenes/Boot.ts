import Phaser from 'phaser';

// Kenney CC0 sprites (see CREDITS.md), 16 px pixel art scaled up in the Play scene.
const IMAGES = {
  wall: 'assets/wall-stone.png',
  floor: 'assets/floor-wood.png',
  counter: 'assets/counter.png',
  potion: 'assets/potion-teal.png',
  'adventurer-0': 'assets/adventurer-bearded.png',
  'adventurer-1': 'assets/adventurer-teal.png',
  'adventurer-2': 'assets/adventurer-knight.png',
};

// Loads the sprites and hands over to the title.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    for (const [key, url] of Object.entries(IMAGES)) this.load.image(key, url);
    // 16×32 awning: frame 0 is the striped top, frame 1 the bottom edge with posts.
    this.load.spritesheet('awning', 'assets/awning-orange.png', { frameWidth: 16, frameHeight: 16 });
  }

  create() {
    // Crisp pixels for the sprites only; text keeps smooth filtering.
    for (const key of [...Object.keys(IMAGES), 'awning']) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.scene.start('Title');
  }
}
