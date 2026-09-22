// Independent check of the 3D simulation: Housner's rocking rigid block (Housner 1963; Makris & Konstantinidis 2003).
//   θ̈ = −p²·[sin(α·sgnθ − θ) + (ü_g/g)·cos(α·sgnθ − θ)],  p² = 3g / (4R)
// b = half the base, h = centre-of-mass height, R = √(b² + h²), α = atan(b/h).
// Rocking starts when |ü_g| > g·tanα; at each impact (θ = 0) the angular velocity is multiplied by
// 1 − 1.5·sin²α (conservation of angular momentum about the new pivot); the block overturns when |θ| > α.
// Integrated with RK4, 10 sub-steps per input sample, input linearly interpolated.

import { G } from './units';

export interface RockResult {
  overturned: boolean;
  tOverturn: number | null;
  maxTheta: number;
  alpha: number;
  impacts?: { before: number; after: number }[];
}

export function rockingResponse(
  block: { base: number; comH: number },
  acc: Float64Array,
  dt: number,
  opts: { theta0?: number; recordImpacts?: boolean } = {},
): RockResult {
  const b = block.base / 2, h = block.comH, R = Math.hypot(b, h), alpha = Math.atan(b / h);
  const p2 = (3 * G) / (4 * R), restitution = 1 - 1.5 * Math.sin(alpha) ** 2, sub = 10, hs = dt / sub;
  let th = opts.theta0 ?? 0, om = 0, rocking = th !== 0, maxTheta = Math.abs(th);
  const impacts: { before: number; after: number }[] = [];

  const ug = (t: number) => {
    const x = t / dt, i = Math.min(acc.length - 2, Math.floor(x)), f = x - i;
    return acc[i] + f * (acc[i + 1] - acc[i]);
  };
  const f = (t: number, y0: number, y1: number): [number, number] => {
    const s = y0 >= 0 ? 1 : -1;
    return [y1, -p2 * (Math.sin(alpha * s - y0) + (ug(t) / G) * Math.cos(alpha * s - y0))];
  };

  for (let step = 0; step < (acc.length - 1) * sub; step++) {
    const t = step * hs;
    if (!rocking) {
      const a = ug(t);
      if (Math.abs(a) <= G * Math.tan(alpha)) continue;
      // Ground accelerating in −x throws the block towards +θ, and vice versa.
      rocking = true;
      th = a < 0 ? 1e-9 : -1e-9;
      om = 0;
    }
    const k1 = f(t, th, om);
    const k2 = f(t + hs / 2, th + (hs / 2) * k1[0], om + (hs / 2) * k1[1]);
    const k3 = f(t + hs / 2, th + (hs / 2) * k2[0], om + (hs / 2) * k2[1]);
    const k4 = f(t + hs, th + hs * k3[0], om + hs * k3[1]);
    const nth = th + (hs / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    const nom = om + (hs / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);

    if (th !== 0 && Math.sign(nth) !== Math.sign(th)) {
      // Impact: the pivot switches corners. Take the speed at the crossing, not at the end of the sub-step.
      const before = om + (th / (th - nth)) * (nom - om);
      const after = before * restitution;
      if (opts.recordImpacts) impacts.push({ before, after });
      if (Math.abs(after) < 1e-4) {
        rocking = false;
        th = 0;
        om = 0;
      } else {
        th = after > 0 ? 1e-9 : -1e-9;
        om = after;
      }
      continue;
    }

    th = nth;
    om = nom;
    maxTheta = Math.max(maxTheta, Math.abs(th));
    if (Math.abs(th) > alpha) return { overturned: true, tOverturn: t + hs, maxTheta, alpha, impacts };
  }
  return { overturned: false, tOverturn: null, maxTheta, alpha, impacts };
}
