// Customer walk (my review of the S5a scene, Session 5): in from the left, a small scale-up at
// the counter for the purchase, then out to the right. The pose is a pure function of game
// time, so pause, a hidden tab and resume-from-save need no tween bookkeeping. No Phaser here.

export interface CustomerLayout {
  left: number; // off-screen start x
  center: number; // counter x
  right: number; // off-screen end x
}

export interface CustomerPose {
  visible: boolean;
  arrival: number; // 1-based arrival number (which adventurer sprite to show)
  x: number;
  scale: number; // multiplier on the sprite's base scale
  lift: number; // px above the floor line (walking step)
}

const WALK_MS = 900;
const SERVE_MS = 600;
const POP = 0.15; // peak scale-up at the purchase
const STEPS = 4; // step bobs per walk
const STEP_LIFT = 3;

const HIDDEN: CustomerPose = { visible: false, arrival: 0, x: 0, scale: 1, lift: 0 };

// Arrivals are at k × intervalMs (k ≥ 1, up to sessionMs). The customer for an arrival walks in
// during the walk time before it, so they reach the counter exactly when the sale happens.
// Durations shrink with short intervals so two customers never overlap (walk + serve + walk ≤ 80 %).
export function customerPose(
  tMs: number,
  intervalMs: number,
  sessionMs: number,
  lastSaleAt: number, // elapsedMs of the latest sale; a missed sale gets no scale-up
  layout: CustomerLayout,
): CustomerPose {
  const walk = Math.min(WALK_MS, 0.3 * intervalMs);
  const serve = Math.min(SERVE_MS, 0.2 * intervalMs);
  const next = (Math.floor(tMs / intervalMs) + 1) * intervalMs;
  const last = next - intervalMs;
  const lift = (p: number) => Math.abs(Math.sin(p * Math.PI * STEPS)) * STEP_LIFT;

  if (next <= sessionMs && next - tMs <= walk) {
    const p = 1 - (next - tMs) / walk;
    return { visible: true, arrival: next / intervalMs, x: layout.left + (layout.center - layout.left) * p, scale: 1, lift: lift(p) };
  }
  if (last >= intervalMs && last <= sessionMs) {
    const since = tMs - last;
    if (since < serve) {
      const scale = lastSaleAt === last ? 1 + POP * Math.sin((Math.PI * since) / serve) : 1;
      return { visible: true, arrival: last / intervalMs, x: layout.center, scale, lift: 0 };
    }
    if (since < serve + walk) {
      const p = (since - serve) / walk;
      return { visible: true, arrival: last / intervalMs, x: layout.center + (layout.right - layout.center) * p, scale: 1, lift: lift(p) };
    }
  }
  return HIDDEN;
}
