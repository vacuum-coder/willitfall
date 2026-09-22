import { describe, it, expect } from 'vitest';
import { intensityToAccel, accelToIntensity } from './intensity';

describe('intensity scale (SNiP II-7-81*)', () => {
  it('maps 7, 8, 9 points to 0.1, 0.2, 0.4 g', () => {
    expect(intensityToAccel(7)).toBeCloseTo(0.1, 10);
    expect(intensityToAccel(8)).toBeCloseTo(0.2, 10);
    expect(intensityToAccel(9)).toBeCloseTo(0.4, 10);
  });

  it('is the inverse of accelToIntensity', () => {
    for (const I of [5, 6.3, 7, 8.8, 10]) {
      expect(accelToIntensity(intensityToAccel(I))).toBeCloseTo(I, 10);
    }
  });
});
