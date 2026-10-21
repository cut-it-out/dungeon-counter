import Phaser from 'phaser';
import './style.css';
import { selectConfig } from './config/index';
import { BootScene } from './scenes/Boot';
import { PlayScene, SCENE_HEIGHT, SCENE_WIDTH } from './scenes/Play';
import { SummaryScene } from './scenes/Summary';
import { TitleScene } from './scenes/Title';

// ?config=baseline|revised; the default rule lives in src/config/index.ts.
const { config, notice } = selectConfig(window.location.search);

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
game.registry.set('configNotice', notice);
