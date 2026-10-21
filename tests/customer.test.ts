import { describe, expect, it } from 'vitest';
import { customerPose } from '../src/scenes/customer';

// A fixed-interval schedule up to and including endMs, like a calm stretch.
const every = (interval: number, endMs = 300000) =>
  Array.from({ length: Math.floor(endMs / interval) }, (_, i) => (i + 1) * interval);

const layout = { left: -40, center: 195, right: 430 };
const pose = (t: number, lastSaleAt = -1, interval = 3000) => customerPose(t, every(interval), lastSaleAt, layout);

describe('customer pose', () => {
  it('is hidden before the first walk-in', () => {
    expect(pose(0).visible).toBe(false);
    expect(pose(2099).visible).toBe(false);
  });

  it('walks in from the left and reaches the counter at the arrival time', () => {
    expect(pose(2100)).toMatchObject({ visible: true, arrival: 1, x: -40, scale: 1 });
    const mid = pose(2550);
    expect(mid.x).toBeGreaterThan(-40);
    expect(mid.x).toBeLessThan(195);
    expect(pose(3000)).toMatchObject({ arrival: 1, x: 195 });
  });

  it('scales up and back down at the counter for a sale', () => {
    expect(pose(3000, 3000).scale).toBe(1);
    expect(pose(3300, 3000).scale).toBeCloseTo(1.15);
    expect(pose(3599, 3000).scale).toBeLessThan(1.01);
  });

  it('does not scale up for a missed sale', () => {
    expect(pose(3300, -1)).toMatchObject({ x: 195, scale: 1 });
  });

  it('walks out to the right, then disappears before the next walk-in', () => {
    const out = pose(4000, 3000);
    expect(out.x).toBeGreaterThan(195);
    expect(out.x).toBeLessThan(430);
    expect(out.scale).toBe(1);
    expect(pose(4499).visible).toBe(true);
    expect(pose(4500).visible).toBe(false);
    expect(pose(5099).visible).toBe(false);
    expect(pose(5100)).toMatchObject({ visible: true, arrival: 2, x: -40 });
  });

  it('serves the arrival at the session end, and no customer walks in after it', () => {
    expect(pose(300000, 300000)).toMatchObject({ visible: true, arrival: 100, x: 195 });
    expect(pose(302500).visible).toBe(false);
  });

  it('never overlaps customers on a short interval', () => {
    for (let t = 0; t < 20000; t += 50) {
      const p = pose(t, -1, 1000);
      if (p.visible) expect(Math.abs(p.arrival * 1000 - t)).toBeLessThan(1000);
    }
    expect(pose(1000, -1, 1000)).toMatchObject({ arrival: 1, x: 195 });
    expect(pose(1500, -1, 1000).visible).toBe(false);
  });
});

describe('customer pose on a rush schedule', () => {
  // Calm at 4 s, then a rush at 0.6 s from 12 s to 15 s, then calm again.
  const arrivals = [4000, 8000, 12000, 12600, 13200, 13800, 14400, 15000, 19000];

  it('numbers customers by their place in the schedule', () => {
    expect(customerPose(12600, arrivals, -1, layout)).toMatchObject({ arrival: 4, x: 195 });
    expect(customerPose(19000, arrivals, -1, layout)).toMatchObject({ arrival: 9, x: 195 });
  });

  it('never shows a customer outside its own arrival gap', () => {
    for (let t = 0; t < 25000; t += 10) {
      const p = customerPose(t, arrivals, -1, layout);
      if (!p.visible) continue;
      const at = arrivals[p.arrival - 1];
      const before = arrivals[p.arrival - 2] ?? 0;
      const after = arrivals[p.arrival] ?? Infinity;
      expect(t).toBeGreaterThan(before);
      expect(t).toBeLessThan(after);
      expect(Math.abs(at - t)).toBeLessThan(Math.max(at - before, Math.min(after - at, 1500)));
    }
  });

  it('walks the last customer out with the full durations', () => {
    expect(customerPose(20400, arrivals, -1, layout).visible).toBe(true);
    expect(customerPose(20500, arrivals, -1, layout).visible).toBe(false);
  });
});
