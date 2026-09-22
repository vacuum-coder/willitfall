import { describe, it, expect } from 'vitest';
import { parseTwoColumn, resample, peakAbs, scaleToPeak, baselineCorrect, integrate } from './record';

describe('record processing', () => {
  it('parses two columns and skips headers', () => {
    const r = parseTwoColumn('time accel\n0 0.1\n0.02  -0.2\n\n0.04 0.3\n');
    expect(r.t).toEqual([0, 0.02, 0.04]);
    expect(r.a).toEqual([0.1, -0.2, 0.3]);
  });

  it('resamples linearly', () => {
    const x = resample([0, 1], [0, 10], 0.25);
    expect(Array.from(x)).toEqual([0, 2.5, 5, 7.5, 10]);
  });

  it('scales to the requested peak', () => {
    const y = scaleToPeak(Float64Array.from([0.1, -0.35, 0.2]), 0.4);
    expect(peakAbs(y)).toBeCloseTo(0.4, 12);
  });

  it('integrates a sine exactly enough', () => {
    const dt = 0.001, w = 2 * Math.PI, n = 2001; // 2 s of a(t) = sin(wt)
    const a = Float64Array.from({ length: n }, (_, i) => Math.sin(w * i * dt));
    const { vel, disp } = integrate(a, dt);
    // v(t) = (1 - cos wt)/w, x(t) = t/w - sin(wt)/w²
    expect(vel[n - 1]).toBeCloseTo((1 - Math.cos(w * 2)) / w, 5);
    expect(disp[n - 1]).toBeCloseTo(2 / w - Math.sin(w * 2) / (w * w), 4);
  });

  it('baseline correction removes velocity drift', () => {
    const dt = 0.01, n = 1001;
    const a = Float64Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * 1.3 * i * dt) + 0.02); // biased
    const { vel } = integrate(baselineCorrect(a, dt), dt);
    expect(Math.abs(vel[n - 1])).toBeLessThan(0.01);
  });
});
