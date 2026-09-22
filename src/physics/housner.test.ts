import { describe, it, expect } from 'vitest';
import { rockingResponse } from './housner';
import { G } from './units';

const block = { base: 0.58, comH: 1.18 }; // PAX 236, even filling
const alpha = Math.atan(0.29 / 1.18);
const R = Math.hypot(0.29, 1.18);
const p2 = (3 * G) / (4 * R);
const constant = (a: number, T: number, dt: number) => Float64Array.from({ length: Math.round(T / dt) }, () => a);

describe('Housner rocking', () => {
  it('does not start rocking below g·tanα', () => {
    const r = rockingResponse(block, constant(-0.95 * G * Math.tan(alpha), 3, 0.001), 0.001);
    expect(r.maxTheta).toBe(0);
    expect(r.overturned).toBe(false);
  });

  it('overturns under a long pulse above g·tanα', () => {
    const r = rockingResponse(block, constant(-1.15 * G * Math.tan(alpha), 3, 0.001), 0.001);
    expect(r.overturned).toBe(true);
  });

  it('reaches the impact with the speed given by energy conservation', () => {
    // Released from θ0 with no input: ½·I·ω² = m·g·R·(cos(α−θ0) − cos α), I = 4/3·m·R².
    const theta0 = 0.5 * alpha;
    const r = rockingResponse(block, new Float64Array(3000), 0.001, { theta0, recordImpacts: true });
    const [first] = r.impacts!;
    const expected = Math.sqrt(2 * p2 * (Math.cos(alpha - theta0) - Math.cos(alpha)));
    expect(Math.abs(Math.abs(first.before) - expected) / expected).toBeLessThan(1e-4);
  });

  it('loses angular velocity by 1 − 1.5 sin²α at impact', () => {
    const r = rockingResponse(block, new Float64Array(3000), 0.001, { theta0: 0.5 * alpha, recordImpacts: true });
    const [first] = r.impacts!;
    expect(first.after / first.before).toBeCloseTo(1 - 1.5 * Math.sin(alpha) ** 2, 6);
  });
});
