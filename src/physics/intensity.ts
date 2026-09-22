// Seismic intensity («баллы») ↔ peak ground acceleration, per SNiP II-7-81*:
// 7 points = 0.1 g, 8 = 0.2 g, 9 = 0.4 g — every point doubles the acceleration.

/** Peak ground acceleration in g for intensity I. */
export const intensityToAccel = (I: number): number => 0.1 * 2 ** (I - 7);

/** Intensity for a peak ground acceleration given in g. */
export const accelToIntensity = (aG: number): number => 7 + Math.log2(aG / 0.1);
