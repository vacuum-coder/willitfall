// Quasi-static tipping of a rigid block: it starts to rock when the horizontal
// acceleration a exceeds g·(B/2)/h, where B is the depth in the shaking direction
// and h the height of the centre of mass. Mass cancels out — weight is not needed.

/** How the furniture is loaded: heavy things at the bottom, evenly, or at the top. */
export type Filling = 'bottom' | 'even' | 'top';

/** Centre-of-mass height as a fraction of the total height H. */
export const COM_FRACTION: Record<Filling, number> = { bottom: 0.4, even: 0.5, top: 0.6 };

/** Coefficient of friction, furniture on a floor (wood/laminate). */
export const DEFAULT_MU = 0.4;

export const comHeight = (H: number, filling: Filling): number => H * COM_FRACTION[filling];

/** Acceleration (in g) at which the block starts to tip. */
export const tipThresholdG = (base: number, H: number, filling: Filling): number =>
  base / 2 / comHeight(H, filling);

/** Tilt angle at which the centre of mass passes over the edge, θ = arctan(B / 2h). */
export const tiltAngleDeg = (base: number, H: number, filling: Filling): number =>
  (Math.atan(tipThresholdG(base, H, filling)) * 180) / Math.PI;

/** The block slides before it tips when friction gives way first (μ < threshold). */
export const slidesFirst = (thresholdG: number, mu: number = DEFAULT_MU): boolean => mu < thresholdG;
