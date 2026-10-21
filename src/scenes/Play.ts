import Phaser from 'phaser';
import type { EconomyConfig } from '../config/types';
import { advanceTo, canRestock, canUpgrade, createState, restock, summarize, upgrade } from '../economy/economy';
import type { EconomyState } from '../economy/types';
import { markerEvent, newRun, type LogEvent, type RunLog } from '../log/eventLog';
import * as overlay from '../ui/overlay';

// Shop scene size in design px. The canvas fills only the middle box of the page's flex
// column (HUD / scene / controls), so it is smaller than the 390×844 page.
export const SCENE_WIDTH = 390;
export const SCENE_HEIGHT = 400;

// Longest frame step fed to the economy, so a stalled or backgrounded tab can't dump
// minutes of game time on the next frame.
const MAX_FRAME_MS = 250;

// Sprites are 16 px pixel art: scenery and potions at 3×, the adventurer at 4× so it reads on a phone.
const SCALE = 3;
const ADVENTURER_SCALE = 4;
const POTION_STEP = 36; // the bottle fills only the middle ~6 px of its tile, so slots overlap
const ADVENTURERS = ['adventurer-0', 'adventurer-1', 'adventurer-2'];

// Tints darken the light Kenney tiles towards Dungeon Ink so the HUD stays the focus.
const TINTS = {
  wall: 0x4a5266,
  floor: 0x8a7468,
  emptySlot: 0x222836,
};
const SHELF_COLOR = 0xb85c42; // Ember Copper trim

export class PlayScene extends Phaser.Scene {
  private cfg!: EconomyConfig;
  private state!: EconomyState;
  private run!: RunLog;
  private clockMs = 0;
  private paused = false;
  private ending = false;
  private slots: Phaser.GameObjects.Image[] = [];
  private shownStock = -1;
  private adventurer!: Phaser.GameObjects.Image;
  private arrivals = 0;

  constructor() {
    super('Play');
  }

  create() {
    this.cfg = this.registry.get('config') as EconomyConfig;
    this.state = createState(this.cfg);
    this.run = newRun(this.cfg);
    this.clockMs = 0;
    this.paused = false;
    this.ending = false;
    this.shownStock = -1;
    this.arrivals = 0;

    this.drawShop();

    overlay.showPlay({
      onRestock: () => this.record(restock(this.state, this.cfg)),
      onUpgrade: () => this.record(upgrade(this.state, this.cfg)),
      onPause: () => this.pause(),
    });
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    });
    this.record(markerEvent(this.state, this.cfg, 'session_start'));
  }

  update(_time: number, delta: number) {
    if (this.paused || this.ending) return;
    this.clockMs += Math.min(delta, MAX_FRAME_MS);
    for (const event of advanceTo(this.state, this.cfg, Math.floor(this.clockMs))) this.record(event);
    this.render();

    if (this.state.finished) {
      this.ending = true;
      const summary = summarize(this.cfg, this.run.events);
      if (import.meta.env.DEV) console.table(summary);
      this.time.delayedCall(800, () => this.scene.start('Summary', { summary }));
    }
  }

  private onVisibilityChange = () => {
    if (document.hidden) this.pause();
  };

  private pause() {
    if (this.paused || this.ending) return;
    this.paused = true;
    overlay.showPause(this.cfg.id, {
      onResume: () => {
        this.paused = false;
        overlay.hidePause();
      },
      onReset: () => this.scene.start('Title'),
    });
  }

  private record(event: LogEvent | null) {
    if (!event) return;
    this.run.events.push(event);
    if (import.meta.env.DEV) {
      const e = event;
      console.log(
        `[${this.cfg.id} ${this.run.runId}] ${(e.elapsedMs / 1000).toFixed(1)}s ${e.event} amount=${e.amount} ` +
          `coins=${e.coins} stock=${e.stock} level=${e.upgradeLevel} price=${e.price}`,
      );
    }
    this.feedback(event);
    this.render();
  }

  private render() {
    overlay.renderPlay(this.state, this.cfg, canRestock(this.state, this.cfg), canUpgrade(this.state, this.cfg));
    if (this.state.stock !== this.shownStock) {
      this.shownStock = this.state.stock;
      this.slots.forEach((slot, i) => {
        // Empty slots show a dark silhouette so shelf capacity stays visible.
        if (i < this.state.stock) slot.clearTint().setAlpha(1);
        else slot.setTint(TINTS.emptySlot).setAlpha(0.5);
      });
    }
  }

  private drawShop() {
    const w = SCENE_WIDTH;
    const tile = 16 * SCALE;
    this.add.tileSprite(0, 0, w, 300, 'wall').setOrigin(0).setTileScale(SCALE).setTint(TINTS.wall);
    this.add.tileSprite(0, 300, w, SCENE_HEIGHT - 300, 'floor').setOrigin(0).setTileScale(SCALE).setTint(TINTS.floor);

    // Stall awning across the top (striped row of the 16×32 sprite only).
    this.add.tileSprite(0, 0, w, tile, 'awning', 0).setOrigin(0).setTileScale(SCALE);

    // Shelf: two planks, one potion slot per unit of capacity.
    const perRow = Math.ceil(this.cfg.shelfCap / 2);
    const rowWidth = (perRow - 1) * POTION_STEP + tile;
    const left = (w - rowWidth) / 2;
    const rowTops = [62, 142];
    this.slots = [];
    for (let i = 0; i < this.cfg.shelfCap; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      this.slots.push(this.add.image(left + col * POTION_STEP, rowTops[row], 'potion').setOrigin(0).setScale(SCALE));
    }
    for (const top of rowTops) {
      this.add.rectangle(left, top + tile - 4, rowWidth, 8, SHELF_COLOR).setOrigin(0);
    }

    // Adventurer cue stands behind the counter; the counter is drawn after it so it overlaps.
    this.adventurer = this.add
      .image(w / 2, 300, ADVENTURERS[0])
      .setOrigin(0.5, 1)
      .setScale(ADVENTURER_SCALE)
      .setAlpha(0);
    this.add.image(w / 2, 296, 'counter').setOrigin(0.5, 0).setScale(SCALE);
  }

  private feedback(event: LogEvent) {
    switch (event.event) {
      case 'sale':
        this.cue();
        this.popup(`+${event.amount}c`, '#E8B85B', 222);
        break;
      case 'missed_sale':
        this.cue();
        this.popup('Out of stock', '#F3E6C9', 222);
        break;
      case 'restock':
        this.popup(`+${this.cfg.restockBatch} potions`, '#39A68D', 370);
        break;
      case 'upgrade':
        this.popup(`Better Brews Lv ${event.upgradeLevel}`, '#E8B85B', 370);
        break;
      case 'session_end':
        this.popup('Shop closed', '#F3E6C9', 370);
        break;
    }
  }

  private cue() {
    // A different adventurer each arrival, cycling through the three sprites.
    this.adventurer.setTexture(ADVENTURERS[this.arrivals % ADVENTURERS.length]);
    this.arrivals += 1;
    this.tweens.killTweensOf(this.adventurer);
    this.adventurer.setAlpha(1).setY(300);
    this.tweens.add({ targets: this.adventurer, alpha: 0, y: 292, duration: 900, ease: 'Quad.easeIn' });
  }

  private popup(text: string, color: string, y: number) {
    const label = this.add
      .text(SCENE_WIDTH / 2, y, text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color,
        stroke: '#222836',
        strokeThickness: 4,
        resolution: window.devicePixelRatio || 1,
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: label, y: y - 40, alpha: 0, duration: 900, onComplete: () => label.destroy() });
  }
}
