import { describe, expect, it } from 'vitest';
import { customerPose } from '../src/scenes/customer';

const layout = { left: -40, center: 195, right: 430 };
const pose = (t: number, lastSaleAt = -1, interval = 3000) => customerPose(t, interval, 300000, lastSaleAt, layout);

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
