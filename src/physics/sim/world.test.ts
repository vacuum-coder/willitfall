import { describe, it, expect } from 'vitest';
import { simulateRoom, floorMotion, SIM_DT, type SimItem } from './world';
import { G } from '../units';

// Real IKEA sizes, uniform filling (CoM at mid-height). Depth d is the tipping base along +z.
const PAX: SimItem = { id: 'pax', x: 0, z: 0, w: 1.0, d: 0.58, H: 2.36, angleDeg: 0, comH: 1.18, anchored: false };
const BILLY: SimItem = { id: 'billy', x: 0, z: 0, w: 0.8, d: 0.28, H: 2.02, angleDeg: 0, comH: 1.01, anchored: false };
const alphaDeg = (b: SimItem) => (Math.atan(b.d / 2 / b.comH) * 180) / Math.PI;
const still = (seconds: number) => new Float64Array(Math.round(seconds / SIM_DT));

/** Floor accelerating at `a` (m/s²) along +z for `T` seconds, then coasting at constant speed. */
function longPulse(a: number, T: number, coast: number): Float64Array {
  const n = Math.round((T + coast) / SIM_DT);
  return Float64Array.from({ length: n }, (_, i) => {
    const t = i * SIM_DT;
    return t <= T ? 0.5 * a * t * t : 0.5 * a * T * T + a * T * (t - T);
  });
}

describe('floor motion from an accelerogram', () => {
  it('starts and ends at rest in the same place, and stays consistent with its acceleration', () => {
    const dt = 0.001;
    // A biased, asymmetric burst: plain integration would leave the floor drifting away.
    const a = Float64Array.from({ length: 6000 }, (_, i) => {
      const t = i * dt;
      return 3 * Math.sin(2 * Math.PI * 1.7 * t) * Math.exp(-((t - 2.5) ** 2)) + 0.05;
    });
    const m = floorMotion(a, dt);
    const n = m.disp.length, h = SIM_DT;
    expect(Math.abs(m.disp[n - 1])).toBeLessThan(1e-6);
    expect(Math.abs((m.disp[n - 1] - m.disp[n - 2]) / h)).toBeLessThan(1e-3);
    expect(Math.abs(m.disp[1] / h)).toBeLessThan(1e-3);
    // The acceleration handed to the Housner check is the second difference of the displacement the floor follows.
    let worst = 0;
    for (let i = 1; i < n - 1; i++) worst = Math.max(worst, Math.abs((m.disp[i + 1] - 2 * m.disp[i] + m.disp[i - 1]) / (h * h) - m.accel[i]));
    expect(worst).toBeLessThan(0.05);
  });
});

describe('Rapier world matches the tipping condition', () => {
  for (const block of [PAX, BILLY]) {
    const alpha = alphaDeg(block);
    for (const [delta, expected] of [[-0.5, 'stood'], [0.5, 'fell']] as const) {
      it(`${block.id}: floor tilted to α ${delta > 0 ? '+' : '−'} 0.5° (α = ${alpha.toFixed(2)}°) → ${expected}`, async () => {
        const phi = ((alpha + delta) * Math.PI) / 180;
        const [r] = await simulateRoom({
          items: [block], floorDisp: still(8), dt: SIM_DT, dir: { x: 0, y: 1 }, mu: 1.0,
          gravity: { x: 0, y: -G * Math.cos(phi), z: G * Math.sin(phi) },
        });
        expect(r.result).toBe(expected);
      }, 60_000);
    }
  }

  for (const block of [PAX, BILLY]) {
    const threshold = (G * (block.d / 2)) / block.comH;
    for (const [factor, expected] of [[0.9, 'stood'], [1.15, 'fell']] as const) {
      it(`${block.id}: 2 s floor pulse at ${factor} × g·(B/2)/h → ${expected}`, async () => {
        const [r] = await simulateRoom({
          items: [block], floorDisp: longPulse(factor * threshold, 2, 3), dt: SIM_DT, dir: { x: 0, y: 1 }, mu: 1.0,
        });
        expect(r.result).toBe(expected);
      }, 60_000);
    }
  }

  it('an anchored item moves with the floor and never falls', async () => {
    const threshold = (G * (PAX.d / 2)) / PAX.comH;
    const [r] = await simulateRoom({
      items: [{ ...PAX, anchored: true }], floorDisp: longPulse(3 * threshold, 2, 1), dt: SIM_DT, dir: { x: 0, y: 1 }, mu: 1.0,
    });
    expect(r.result).toBe('stood');
    expect(r.maxTiltDeg).toBe(0);
  });

  it('the second horizontal component shakes the floor across the first', async () => {
    // Shaking along x (dir) meets the 1 m width: far below tipping. Along z (the second component) the 0.58 m depth tips.
    const threshold = (G * (PAX.d / 2)) / PAX.comH, pulse = longPulse(1.15 * threshold, 2, 3);
    const [alongX] = await simulateRoom({ items: [PAX], floorDisp: pulse, dt: SIM_DT, dir: { x: 1, y: 0 }, mu: 1.0 });
    expect(alongX.result).toBe('stood');
    const [across] = await simulateRoom({
      items: [PAX], floorDisp: new Float64Array(pulse.length), floorDisp2: pulse, dt: SIM_DT, dir: { x: 1, y: 0 }, mu: 1.0,
    });
    expect(across.result).toBe('fell');
  });

  it('a shelf on weak plugs hangs until the floor reaches 0.3 g, then tears off and falls', async () => {
    const shelf: SimItem = { id: 'shelf', x: 0, z: 0, w: 0.8, d: 0.25, H: 0.2, angleDeg: 0, comH: 0.1, anchored: false, y0: 1.5, releaseG: 0.3 };
    const [holds] = await simulateRoom({ items: [shelf], floorDisp: longPulse(0.2 * G, 1, 1), dt: SIM_DT, dir: { x: 0, y: 1 } });
    expect(holds.result).toBe('stood');
    const [tears] = await simulateRoom({ items: [shelf], floorDisp: longPulse(0.4 * G, 1, 1), dt: SIM_DT, dir: { x: 0, y: 1 } });
    expect(tears.result).toBe('fell');
    const [anchored] = await simulateRoom({ items: [{ ...shelf, releaseG: undefined, anchored: true }], floorDisp: longPulse(0.4 * G, 1, 1), dt: SIM_DT, dir: { x: 0, y: 1 } });
    expect(anchored.result).toBe('stood');
  });

  it('furniture standing flush against a wall is not pushed by it', async () => {
    // The wardrobe (depth 0.58, centred at z = 0) has its back face on the wall line z = 0.29; the room is on the −z side.
    const [r] = await simulateRoom({
      items: [PAX], floorDisp: still(2), dt: SIM_DT, dir: { x: 1, y: 0 },
      walls: [{ ax: 1, az: 0.29, bx: -1, bz: 0.29, nx: 0, nz: -1 }],
    });
    expect(r.result).toBe('stood');
    expect(Math.hypot(r.finalPos.x, r.finalPos.z)).toBeLessThan(0.005);
  });

  it('a low dresser slides instead of tipping at μ = 0.4', async () => {
    const malm: SimItem = { id: 'malm', x: 0, z: 0, w: 0.8, d: 0.48, H: 1.0, angleDeg: 0, comH: 0.5, anchored: false };
    const [r] = await simulateRoom({
      items: [malm], floorDisp: longPulse(0.45 * G, 1, 1), dt: SIM_DT, dir: { x: 0, y: 1 }, mu: 0.4,
    });
    expect(r.result).toBe('slid');
  });
});
