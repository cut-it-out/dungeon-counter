import Phaser from 'phaser';
import './style.css';
import baseline from './config/baseline-v1.json';
import type { EconomyConfig } from './config/types';
import { validateConfig } from './config/validate';
import { BootScene } from './scenes/Boot';
import { PlayScene, SCENE_HEIGHT, SCENE_WIDTH } from './scenes/Play';
import { SummaryScene } from './scenes/Summary';
import { TitleScene } from './scenes/Title';

// Config selection (?config=) arrives in S9; until then the frozen baseline is used.
const config = validateConfig(baseline as EconomyConfig);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'scene',
  width: SCENE_WIDTH,
  height: SCENE_HEIGHT,
  backgroundColor: '#222836',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, PlayScene, SummaryScene],
});
game.registry.set('config', config);
