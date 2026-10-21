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

// `arrivals` is the economy's sorted arrival schedule (ms). The customer for an arrival walks in
// during the walk time before it, so they reach the counter exactly when the sale happens.
// Durations shrink with the gap between two arrivals (rushes), so two customers never overlap:
// serve + walk out + the next walk in ≤ 80 % of the gap.
export function customerPose(
  tMs: number,
  arrivals: number[],
  lastSaleAt: number, // elapsedMs of the latest sale; a missed sale gets no scale-up
  layout: CustomerLayout,
): CustomerPose {
  const index = arrivals.findIndex((a) => a > tMs); // the next arrival; -1 when none is left
  const nextIndex = index < 0 ? arrivals.length : index;
  const next = arrivals[nextIndex];
  const last = arrivals[nextIndex - 1];
  const gap = next !== undefined ? next - (last ?? 0) : Infinity; // before `next`, and after `last`
  const walk = Math.min(WALK_MS, 0.3 * gap);
  const serve = Math.min(SERVE_MS, 0.2 * gap);
  const lift = (p: number) => Math.abs(Math.sin(p * Math.PI * STEPS)) * STEP_LIFT;

  if (next !== undefined && next - tMs <= walk) {
    const p = 1 - (next - tMs) / walk;
    return { visible: true, arrival: nextIndex + 1, x: layout.left + (layout.center - layout.left) * p, scale: 1, lift: lift(p) };
  }
  if (last !== undefined) {
    const since = tMs - last;
    if (since < serve) {
      const scale = lastSaleAt === last ? 1 + POP * Math.sin((Math.PI * since) / serve) : 1;
      return { visible: true, arrival: nextIndex, x: layout.center, scale, lift: 0 };
    }
    if (since < serve + walk) {
      const p = (since - serve) / walk;
      return { visible: true, arrival: nextIndex, x: layout.center + (layout.right - layout.center) * p, scale: 1, lift: lift(p) };
    }
  }
  return HIDDEN;
}
