import { describe, it, expect } from 'vitest';
import { tipThresholdG, tiltAngleDeg, slidesFirst } from './tipping';

describe('tipping thresholds', () => {
  it('IKEA PAX 100×58×236, even: 0.2458 g, 13.81°', () => {
    expect(tipThresholdG(0.58, 2.36, 'even')).toBeCloseTo(0.2458, 4);
    expect(tiltAngleDeg(0.58, 2.36, 'even')).toBeCloseTo(13.81, 2);
  });

  it('IKEA BILLY 80×28×202 is the least stable', () => {
    expect(tipThresholdG(0.28, 2.02, 'even')).toBeCloseTo(0.1386, 4);
  });

  it('top-heavy filling lowers the threshold', () => {
    expect(tipThresholdG(0.58, 2.36, 'top')).toBeCloseTo(0.29 / (0.6 * 2.36), 6);
  });

  it('IKEA MALM 80×48×100 slides before tipping at μ = 0.4', () => {
    expect(slidesFirst(tipThresholdG(0.48, 1.0, 'even'))).toBe(true);
  });
});
