import { describe, it, expect } from 'vitest';
import { makeBuilding, floorResponse, approxPeriod } from './building';

const sine = (A: number, w: number, dt: number, T: number) =>
  Float64Array.from({ length: Math.round(T / dt) + 1 }, (_, i) => A * Math.sin(w * i * dt));

describe('shear building', () => {
  it('ASCE 7-16 approximate period for 9 storeys × 2.8 m', () => {
    expect(approxPeriod(9)).toBeCloseTo(0.0488 * (9 * 2.8) ** 0.75, 10);
  });

  it('ground floor moves with the ground', () => {
    const b = makeBuilding(9, 0.55), dt = 0.001, g = sine(1, 10, dt, 2);
    const r = floorResponse(b, g, dt, 1);
    expect(Math.max(...Array.from(r.accel, (v, i) => Math.abs(v - g[i])))).toBeLessThan(1e-12);
  });

  it('a very stiff building moves rigidly', () => {
    const b = makeBuilding(9, 0.005), dt = 0.0002, g = sine(1, 10, dt, 1);
    const r = floorResponse(b, g, dt, 9);
    const err = Math.max(...Array.from(r.accel, (v, i) => Math.abs(v - g[i])));
    expect(err).toBeLessThan(0.02);
  });

  it('single storey matches the analytic steady-state amplitude', () => {
    const T1 = 0.5, w1 = (2 * Math.PI) / T1, zeta = 0.05, b = makeBuilding(1, T1, zeta);
    const wr = 0.5 * w1, r = wr / w1, dt = 0.0005, g = sine(1, wr, dt, 20);
    const res = floorResponse(b, g, dt, 2); // slab above the single storey
    const tail = Array.from(res.disp).slice(-Math.round(((2 * Math.PI) / wr) * 3 / dt));
    const amp = Math.max(...tail.map(Math.abs));
    const expected = 1 / (w1 * w1) / Math.sqrt((1 - r * r) ** 2 + (2 * zeta * r) ** 2);
    expect(Math.abs(amp - expected) / expected).toBeLessThan(0.001);
  });

  it('free vibration of mode 1 has period T1', () => {
    const b = makeBuilding(9, 0.55, 0), dt = 0.0005;
    const pulse = Float64Array.from({ length: Math.round(6 / dt) }, (_, i) => (i * dt < 0.05 ? 1 : 0));
    const top = floorResponse(b, pulse, dt, 10).disp;
    const zc: number[] = []; // upward zero crossings after the pulse
    for (let i = Math.round(0.5 / dt); i < top.length; i++) if (top[i - 1] < 0 && top[i] >= 0) zc.push(i * dt);
    const period = (zc[zc.length - 1] - zc[0]) / (zc.length - 1);
    expect(period).toBeGreaterThan(0.55 * 0.97);
    expect(period).toBeLessThan(0.55 * 1.03);
  });
});
