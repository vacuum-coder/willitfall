import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseRecord, peakAbs } from './record';

const read = (id: string) => parseRecord(JSON.parse(readFileSync(`public/records/${id}.json`, 'utf-8')));

describe('real ground-motion records', () => {
  it('El Centro 1940 N–S: 2688 points, dt 0.02 s, peak 0.349 g', () => {
    const r = read('elcentro-ns');
    expect(r.accelG.length).toBe(2688);
    expect(r.dt).toBe(0.02);
    expect(peakAbs(r.accelG)).toBeCloseTo(0.349, 3);
  });

  it('Almaty 23.01.2024, KZ.KNDC: 6 minutes at 40 Hz from the real station', () => {
    const r = read('almaty-2024-kndc');
    expect(r.dt).toBe(0.025);
    expect(r.accelG.length).toBe(14401);
    expect(r.citation).toContain('10.7914/SN/KZ');
    expect(r.citation).toContain('us7000lsze');
  });

  it('stored peak matches the samples', () => {
    for (const id of ['elcentro-ns', 'almaty-2024-kndc']) {
      const r = read(id);
      expect(Math.abs(peakAbs(r.accelG) - r.peakG) / r.peakG).toBeLessThan(1e-5);
    }
  });

  it('rejects a malformed record', () => {
    expect(() => parseRecord({ id: 'x', dt: 0, accelG: [] })).toThrow();
  });
});
