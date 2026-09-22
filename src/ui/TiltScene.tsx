// Tilt-experiment illustration (C-PhysicsCheck «Опыт с наклоном»), ported from design/source/physics/tiltScene.js
// and made live: the board angle and the block's proportions come from the calculator.

import { C } from './ds';
import { num } from './format';

const c30 = Math.cos(Math.PI / 6);
const S = 58;
const P = (x: number, y: number, z: number): [number, number] => [(x - y) * c30 * S, ((x + y) / 2 - z) * S];
type V3 = [number, number, number];

export function TiltScene({ ratio, angleDeg, predictedDeg }: { ratio: number; angleDeg: number; predictedDeg: number }) {
  const polys: { pts: V3[]; fill: string; stroke?: string; sw?: number }[] = [];
  const lines: { pts: V3[]; stroke: string; sw: number; dash?: string }[] = [];
  const poly = (pts: V3[], fill: string, stroke: string = C.text, sw = 0.6) => polys.push({ pts, fill, stroke, sw });

  const H = 1.0, B = Math.min(0.9, Math.max(0.08, ratio * H));
  const th = (Math.max(0, Math.min(45, angleDeg)) * Math.PI) / 180, cs = Math.cos(th), sn = Math.sin(th);
  const Lb = 1.9, Wb = 0.9, tb = 0.05;
  const Q = (u: number, y: number, n: number): V3 => [-u * cs + n * sn, y, u * sn + n * cs];
  const qa = (a: V3[]) => a.map((p) => Q(...p));

  poly([[-2.1, -0.1, 0], [0.4, -0.1, 0], [0.4, 1.15, 0], [-2.1, 1.15, 0]], 'var(--scene-floor)', 'none');
  for (let x = -1.8; x < 0.4; x += 0.3) lines.push({ pts: [[x, -0.1, 0], [x, 1.15, 0]], stroke: 'var(--scene-floor-line)', sw: 0.6 });

  // Books under the raised end.
  const xs1 = -1.52, xs0 = -1.84, zt = Math.max(0.001, 1.52 * Math.tan(th));
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, top: string, fx: string, fy: string) => {
    poly([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], fx);
    poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], fy);
    poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], top);
  };
  box(xs0, xs1, 0.2, 0.72, 0, zt, 'var(--scene-bed-top)', 'var(--scene-bed-x)', 'var(--scene-bed-y)');

  // Board.
  poly(qa([[0, 0, 0], [0, Wb, 0], [0, Wb, tb], [0, 0, tb]]), 'var(--scene-dresser-x)');
  poly(qa([[0, Wb, 0], [Lb, Wb, 0], [Lb, Wb, tb], [0, Wb, tb]]), 'var(--scene-dresser-y)');
  poly(qa([[0, 0, tb], [Lb, 0, tb], [Lb, Wb, tb], [0, Wb, tb]]), 'var(--scene-dresser-top)');

  // Phone with a level app.
  const pu0 = 0.78, pu1 = 1.18, py0 = 0.5, py1 = 0.72, pt = 0.035;
  poly(qa([[pu0, py0, tb], [pu0, py1, tb], [pu0, py1, tb + pt], [pu0, py0, tb + pt]]), 'var(--scene-poche)');
  poly(qa([[pu0, py1, tb], [pu1, py1, tb], [pu1, py1, tb + pt], [pu0, py1, tb + pt]]), 'var(--scene-poche)');
  poly(qa([[pu0, py0, tb + pt], [pu1, py0, tb + pt], [pu1, py1, tb + pt], [pu0, py1, tb + pt]]), 'var(--scene-poche)');
  poly(qa([[pu0 + 0.03, py0 + 0.025, tb + pt], [pu1 - 0.03, py0 + 0.025, tb + pt], [pu1 - 0.03, py1 - 0.025, tb + pt], [pu0 + 0.03, py1 - 0.025, tb + pt]]), 'var(--scene-window)', C.text, 0.5);

  // The block against the stopper, tilting with the board.
  const sw = 0.06, sh = 0.08, u0 = sw, u1 = sw + B, y0 = 0.28, y1 = 0.62, n0 = tb, n1 = tb + H;
  poly(qa([[u0, y0, n0], [u0, y1, n0], [u0, y1, n1], [u0, y0, n1]]), 'var(--scene-danger-back)', C.text, 0.8);
  poly(qa([[u0, y1, n0], [u1, y1, n0], [u1, y1, n1], [u0, y1, n1]]), 'var(--scene-danger-side)', C.text, 0.8);
  poly(qa([[u0, y0, n1], [u1, y0, n1], [u1, y1, n1], [u0, y1, n1]]), 'var(--scene-danger-top)', C.text, 0.8);

  // Stopper strip.
  poly(qa([[0, 0, tb], [0, Wb, tb], [0, Wb, tb + sh], [0, 0, tb + sh]]), 'var(--scene-bedhead-x)');
  poly(qa([[0, Wb, tb], [sw, Wb, tb], [sw, Wb, tb + sh], [0, Wb, tb + sh]]), 'var(--scene-bedhead-y)');
  poly(qa([[0, 0, tb + sh], [sw, 0, tb + sh], [sw, Wb, tb + sh], [0, Wb, tb + sh]]), 'var(--scene-bedhead-top)');

  // Centre of mass and the true vertical through it, down to the level of the pivot edge.
  const cm = Q(u0 + B / 2, y1, n0 + H / 2), pv = Q(u0, y1, n0);
  const foot: V3 = [cm[0], cm[1], pv[2]];
  const over = angleDeg >= predictedDeg - 1e-9;
  const cmP = P(...cm), pvP = P(...pv), footP = P(...foot);

  const arc: V3[] = [];
  for (let a = 0; a <= angleDeg + 0.01; a += 1) { const t = (a * Math.PI) / 180; arc.push([-Math.cos(t), Wb, Math.sin(t)]); }
  arc.push([-cs, Wb, sn]);

  const all = polys.flatMap((p) => p.pts.map((q) => P(...q)));
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const vb = { x: Math.min(...xs) - 12, y: Math.min(...ys) - 12, w: Math.max(...xs) - Math.min(...xs) + 24, h: Math.max(...ys) - Math.min(...ys) + 24 };
  const str = (a: V3[]) => a.map((p) => P(...p).map((v) => Math.round(v * 10) / 10).join(',')).join(' ');
  const arcMid = P(-Math.cos(th / 2), Wb, Math.sin(th / 2));

  return (
    <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} width="100%" role="img" aria-label={`Опыт с наклоном: доска поднята на ${num(angleDeg)}°, брусок в пропорции ${num(ratio, 2)} прижат к упору. ${over ? 'Вертикаль через центр тяжести вышла за ребро — брусок опрокидывается.' : 'Вертикаль через центр тяжести ещё внутри основания — брусок стоит.'}`} style={{ display: 'block' }}>
      {polys.map((p, k) => <polygon key={k} points={str(p.pts)} style={{ fill: p.fill, stroke: p.stroke }} strokeWidth={p.sw} strokeLinejoin="round" />)}
      {lines.map((l, k) => <polyline key={`l${k}`} points={str(l.pts)} fill="none" style={{ stroke: l.stroke }} strokeWidth={l.sw} />)}
      <polyline points={str([[0.06, Wb, 0.004], [-1.3, Wb, 0.004]])} fill="none" style={{ stroke: C.text }} strokeWidth="0.9" strokeDasharray="4 3" />
      <polyline points={str(arc)} fill="none" style={{ stroke: C.danger }} strokeWidth="1.6" />
      <line x1={cmP[0]} y1={cmP[1]} x2={footP[0]} y2={footP[1]} style={{ stroke: C.surface }} strokeWidth="2.6" />
      <line x1={cmP[0]} y1={cmP[1]} x2={footP[0]} y2={footP[1]} style={{ stroke: over ? C.danger : C.text }} strokeWidth="1.2" strokeDasharray="3 3" />
      <circle cx={cmP[0]} cy={cmP[1]} r="4.5" style={{ fill: C.surface, stroke: C.text }} strokeWidth="1.2" />
      <path d={`M${cmP[0] - 4.5},${cmP[1]} h9 M${cmP[0]},${cmP[1] - 4.5} v9`} style={{ stroke: C.text }} strokeWidth="1" />
      <circle cx={pvP[0]} cy={pvP[1]} r="2.6" style={{ fill: C.danger, stroke: C.surface }} strokeWidth="1.2" />
      <text x={arcMid[0] - 70} y={arcMid[1] + 4} fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="700" style={{ fill: C.text }}>
        θ = <tspan style={{ fill: C.danger }}>{num(angleDeg)}°</tspan>
      </text>
    </svg>
  );
}

/** The same experiment from the side: board, stopper, block, centre of mass and its vertical. */
export function TiltSide({ ratio, angleDeg, predictedDeg }: { ratio: number; angleDeg: number; predictedDeg: number }) {
  const H = 110, B = Math.min(100, Math.max(9, ratio * H));
  const t = (Math.max(0, Math.min(45, angleDeg)) * Math.PI) / 180;
  const hx = 290, hy = 170, L = 250;
  // Board frame: u runs uphill to the left from the hinge, n is its normal.
  const at = (u: number, n: number) => ({ x: hx - u * Math.cos(t) + n * Math.sin(t), y: hy - u * Math.sin(t) - n * Math.cos(t) });
  const pts = (a: { x: number; y: number }[]) => a.map((p) => `${p.x},${p.y}`).join(' ');
  const board = [at(0, 0), at(L, 0), at(L, 6), at(0, 6)];
  const block = [at(8, 6), at(8 + B, 6), at(8 + B, 6 + H), at(8, 6 + H)];
  const cm = at(8 + B / 2, 6 + H / 2), pivot = at(8, 6);
  const over = angleDeg >= predictedDeg - 1e-9;
  return (
    <svg viewBox="0 0 348 190" width="100%" role="img" aria-label={`Вид сбоку: доска наклонена на ${num(angleDeg)}°`} style={{ display: 'block' }}>
      <line x1="20" y1={hy} x2="330" y2={hy} style={{ stroke: C.text }} strokeWidth="3" />
      <polygon points={pts(board)} style={{ fill: 'var(--scene-dresser-top)', stroke: C.text }} strokeWidth="0.8" />
      <polygon points={pts([at(0, 6), at(6, 6), at(6, 14), at(0, 14)])} style={{ fill: 'var(--scene-bedhead-top)', stroke: C.text }} strokeWidth="0.8" />
      <polygon points={pts(block)} style={{ fill: 'var(--scene-danger-side)', stroke: C.text }} strokeWidth="1" />
      <line x1={cm.x} y1={cm.y} x2={cm.x} y2={pivot.y} style={{ stroke: over ? C.danger : C.text }} strokeWidth="1.2" strokeDasharray="3 3" />
      <circle cx={cm.x} cy={cm.y} r="4.5" style={{ fill: C.surface, stroke: C.text }} strokeWidth="1.2" />
      <circle cx={pivot.x} cy={pivot.y} r="3" style={{ fill: C.danger }} />
      <path d={`M${hx - 60},${hy} A60,60 0 0 1 ${hx - 60 * Math.cos(t)},${hy - 60 * Math.sin(t)}`} fill="none" style={{ stroke: C.danger }} strokeWidth="1.6" />
      <text x={hx - 120} y={hy - 12} fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="700" style={{ fill: C.danger }}>θ = {num(angleDeg)}°</text>
    </svg>
  );
}
