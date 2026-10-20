import Phaser from 'phaser';
import type { EconomyConfig } from '../config/types';
import { advanceTo, canRestock, canUpgrade, createState, restock, summarize, upgrade } from '../economy/economy';
import type { EconomyEvent, EconomyState } from '../economy/types';
import * as overlay from '../ui/overlay';

// Shop scene size in design px. The canvas fills only the middle box of the page's flex
// column (HUD / scene / controls), so it is smaller than the 390×844 page.
export const SCENE_WIDTH = 390;
export const SCENE_HEIGHT = 400;

// Longest frame step fed to the economy, so a stalled or backgrounded tab can't dump
// minutes of game time on the next frame.
const MAX_FRAME_MS = 250;

const COLORS = {
  wall: 0x2c3344,
  floor: 0x3a3330,
  shelf: 0xb85c42,
  counter: 0x7a4a32,
  potion: 0x39a68d,
  slot: 0x4a5368,
  adventurer: 0xe8b85b,
};

export class PlayScene extends Phaser.Scene {
  private cfg!: EconomyConfig;
  private state!: EconomyState;
  private log: EconomyEvent[] = [];
  private clockMs = 0;
  private paused = false;
  private ending = false;
  private slots: Phaser.GameObjects.Rectangle[] = [];
  private shownStock = -1;
  private adventurer!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Play');
  }

  create() {
    this.cfg = this.registry.get('config') as EconomyConfig;
    this.state = createState(this.cfg);
    this.log = [];
    this.clockMs = 0;
    this.paused = false;
    this.ending = false;
    this.shownStock = -1;

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
    this.render();
  }

  update(_time: number, delta: number) {
    if (this.paused || this.ending) return;
    this.clockMs += Math.min(delta, MAX_FRAME_MS);
    for (const event of advanceTo(this.state, this.cfg, Math.floor(this.clockMs))) this.record(event);
    this.render();

    if (this.state.finished) {
      this.ending = true;
      const summary = summarize(this.cfg, this.log);
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

  private record(event: EconomyEvent | null) {
    if (!event) return;
    this.log.push(event);
    if (import.meta.env.DEV) {
      const e = event;
      console.log(
        `[${this.cfg.id}] ${(e.elapsedMs / 1000).toFixed(1)}s ${e.event} amount=${e.amount} ` +
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
        const filled = i < this.state.stock;
        slot.setFillStyle(filled ? COLORS.potion : COLORS.slot, filled ? 1 : 0.35);
      });
    }
  }

  private drawShop() {
    const w = SCENE_WIDTH;
    this.add.rectangle(0, 0, w, 270, COLORS.wall).setOrigin(0);
    this.add.rectangle(0, 270, w, SCENE_HEIGHT - 270, COLORS.floor).setOrigin(0);

    // Shelf: two planks of slots, one slot per potion of capacity.
    const perRow = Math.ceil(this.cfg.shelfCap / 2);
    const slotW = 24;
    const gap = 8;
    const rowWidth = perRow * slotW + (perRow - 1) * gap;
    const left = (w - rowWidth) / 2;
    this.slots = [];
    for (let i = 0; i < this.cfg.shelfCap; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const y = 40 + row * 80;
      this.slots.push(this.add.rectangle(left + col * (slotW + gap), y, slotW, 40, COLORS.slot).setOrigin(0));
    }
    for (const y of [82, 162]) this.add.rectangle(left - 12, y, rowWidth + 24, 8, COLORS.shelf).setOrigin(0);

    // Counter and the adventurer cue (a placeholder until the sprites arrive in S5a).
    this.adventurer = this.add.rectangle(w / 2, 250, 44, 80, COLORS.adventurer).setAlpha(0);
    this.add.rectangle(40, 290, w - 80, 50, COLORS.counter).setOrigin(0);
  }

  private feedback(event: EconomyEvent) {
    switch (event.event) {
      case 'sale':
        this.cue();
        this.popup(`+${event.amount}c`, '#E8B85B', 190);
        break;
      case 'missed_sale':
        this.cue();
        this.popup('Out of stock', '#F3E6C9', 190);
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
    this.tweens.killTweensOf(this.adventurer);
    this.adventurer.setAlpha(1).setY(250);
    this.tweens.add({ targets: this.adventurer, alpha: 0, y: 240, duration: 900, ease: 'Quad.easeIn' });
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
