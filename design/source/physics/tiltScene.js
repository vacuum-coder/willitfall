// Tilt-experiment scene. Same isometric projection as sceneC.js: x -> (cos30, sin30), y -> (-cos30, sin30), z up.
// Colors only from tokens --scene-* / --c-*.
const S = +(process.argv[2] || 58), OX = +(process.argv[3] || 250), OY = +(process.argv[4] || 110);
const c = Math.cos(Math.PI / 6);
const P = (x, y, z) => [(x - y) * c * S + OX, ((x + y) / 2 - z) * S + OY];
const f = v => Math.round(v * 10) / 10;
const pts = a => a.map(p => { const q = P(...p); return f(q[0]) + ',' + f(q[1]); }).join(' ');
const out = [];
const all = [];
const poly = (a, fill, extra = '') => { a.forEach(p => all.push(P(...p))); out.push(`<polygon points="${pts(a)}" fill="${fill}" ${extra}/>`); };
const INK = '#2B2622', CLAY = '#B84A30', SAGE = '#4F6E5D';
const st = (sw = 0.6, col = INK) => `stroke="${col}" stroke-width="${sw}" stroke-linejoin="round"`;

const B = 0.25, H = 1.0;               // box: depth B, height H (1:4 like 55 x 220)
const th = Math.atan(B / H);           // 14.04 deg - tipping angle
const cs = Math.cos(th), sn = Math.sin(th);
const Lb = 1.9, Wb = 0.9, tb = 0.05;   // board
// board frame: hinge at x=0,z=0; u uphill along board, n normal
const Q = (u, y, n) => [-u * cs + n * sn, y, u * sn + n * cs];
const qa = a => a.map(p => Q(...p));

// floor / table slab
poly([[-2.1, -0.1, 0], [0.4, -0.1, 0], [0.4, 1.15, 0], [-2.1, 1.15, 0]], '#E9DFCF');
for (let x = -1.8; x < 0.4; x += 0.3) out.push(`<polyline points="${pts([[x, -0.1, 0], [x, 1.15, 0]])}" fill="none" stroke="#DDD1BE" stroke-width="0.6"/>`);
// soft shadow under board
poly([[-1.85, 0.05, 0.002], [0.05, 0.05, 0.002], [0.12, 0.98, 0.002], [-1.8, 0.98, 0.002]], 'rgba(58,51,45,0.13)', 'filter="url(#softT)"');

// support: stack of books under the raised end
const xs1 = -1.52, xs0 = -1.84, zt = 1.52 * Math.tan(th);
function box(x0, x1, y0, y1, z0, z1, top, fx, fy, sw = 0.6) {
  poly([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], fx, st(sw));
  poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], fy, st(sw));
  poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], top, st(sw));
}
box(xs0, xs1, 0.2, 0.72, 0, zt, '#E6DAC7', '#D2C3AC', '#DCCEB9');
for (const z of [zt / 3, 2 * zt / 3]) out.push(`<polyline points="${pts([[xs1, 0.2, z], [xs1, 0.72, z], [xs0, 0.72, z]])}" fill="none" stroke="${INK}" stroke-width="0.5"/>`);

// board: end face (u=0), near side (y=Wb), top (n=tb)
poly(qa([[0, 0, 0], [0, Wb, 0], [0, Wb, tb], [0, 0, tb]]), '#DDC391', st());
poly(qa([[0, Wb, 0], [Lb, Wb, 0], [Lb, Wb, tb], [0, Wb, tb]]), '#E6D0A4', st());
poly(qa([[0, 0, tb], [Lb, 0, tb], [Lb, Wb, tb], [0, Wb, tb]]), '#EEDDB8', st());

// phone with level app, lying on the board uphill
const pu0 = 0.78, pu1 = 1.18, py0 = 0.5, py1 = 0.72, pt = 0.035;
poly(qa([[pu0, py0, tb], [pu0, py1, tb], [pu0, py1, tb + pt], [pu0, py0, tb + pt]]), '#3A332D', st());
poly(qa([[pu0, py1, tb], [pu1, py1, tb], [pu1, py1, tb + pt], [pu0, py1, tb + pt]]), '#3A332D', st());
poly(qa([[pu0, py0, tb + pt], [pu1, py0, tb + pt], [pu1, py1, tb + pt], [pu0, py1, tb + pt]]), '#3A332D', st());
poly(qa([[pu0 + 0.03, py0 + 0.025, tb + pt], [pu1 - 0.03, py0 + 0.025, tb + pt], [pu1 - 0.03, py1 - 0.025, tb + pt], [pu0 + 0.03, py1 - 0.025, tb + pt]]), '#E3EAE4', st(0.5));
// level vial + bubble on the screen
out.push(`<polyline points="${pts(qa([[pu0 + 0.08, (py0 + py1) / 2, tb + pt], [pu1 - 0.08, (py0 + py1) / 2, tb + pt]]))}" fill="none" stroke="${SAGE}" stroke-width="1.2" stroke-linecap="round"/>`);
const bub = P(...Q((pu0 + pu1) / 2 - 0.06, (py0 + py1) / 2, tb + pt));
out.push(`<circle cx="${f(bub[0])}" cy="${f(bub[1])}" r="2.4" fill="${SAGE}"/>`);

// box (tilted with the board), standing on the board against the stopper
const sw = 0.06, sh = 0.08;            // stopper depth/height
const u0 = sw, u1 = sw + B, y0 = 0.28, y1 = 0.62, n0 = tb, n1 = tb + H;
poly(qa([[u0, y0, n0], [u0, y1, n0], [u0, y1, n1], [u0, y0, n1]]), '#A4452D', st(0.8));
poly(qa([[u0, y1, n0], [u1, y1, n0], [u1, y1, n1], [u0, y1, n1]]), '#BC5236', st(0.8));
poly(qa([[u0, y0, n1], [u1, y0, n1], [u1, y1, n1], [u0, y1, n1]]), '#D47559', st(0.8));
out.push(`<polyline points="${pts(qa([[u0 + 0.03, y1, n0 + 0.06], [u0 + 0.03, y1, n1 - 0.06]]))}" fill="none" stroke="#8E3A25" stroke-width="0.6"/>`);

// stopper strip at the lower edge
poly(qa([[0, 0, tb], [0, Wb, tb], [0, Wb, tb + sh], [0, 0, tb + sh]]), '#CBB99E', st());
poly(qa([[0, Wb, tb], [sw, Wb, tb], [sw, Wb, tb + sh], [0, Wb, tb + sh]]), '#D3C3AA', st());
poly(qa([[0, 0, tb + sh], [sw, 0, tb + sh], [sw, Wb, tb + sh], [0, Wb, tb + sh]]), '#DCCDB6', st());

// centre of mass on the near face and the vertical through it, landing on the pivot edge
const cm = Q(u0 + B / 2, y1, n0 + H / 2), pv = Q(u0, y1, n0);
const cmP = P(...cm), pvP = P(...pv);
out.push(`<line x1="${f(cmP[0])}" y1="${f(cmP[1])}" x2="${f(pvP[0])}" y2="${f(pvP[1])}" stroke="#FFFFFF" stroke-width="2.6"/>`);
out.push(`<line x1="${f(cmP[0])}" y1="${f(cmP[1])}" x2="${f(pvP[0])}" y2="${f(pvP[1])}" stroke="${INK}" stroke-width="1.2" stroke-dasharray="3 3"/>`);
out.push(`<circle cx="${f(cmP[0])}" cy="${f(cmP[1])}" r="4.5" fill="#FFFFFF" stroke="${INK}" stroke-width="1.2"/><path d="M${f(cmP[0] - 4.5)},${f(cmP[1])} h9 M${f(cmP[0])},${f(cmP[1] - 4.5)} v9" stroke="${INK}" stroke-width="1"/>`);
out.push(`<circle cx="${f(pvP[0])}" cy="${f(pvP[1])}" r="2.6" fill="${CLAY}" stroke="#FFFFFF" stroke-width="1.2"/>`);

// angle: horizontal reference on the floor (near side) + arc
const r = 1.0;
out.push(`<polyline points="${pts([[0.06, Wb, 0.004], [-1.3, Wb, 0.004]])}" fill="none" stroke="${INK}" stroke-width="0.9" stroke-dasharray="4 3"/>`);
const arc = []; for (let a = 0; a <= th * 180 / Math.PI + 0.01; a += 1) { const t = a * Math.PI / 180; arc.push([-r * Math.cos(t), Wb, r * Math.sin(t)]); }
arc.push([-r * cs, Wb, r * sn]);
out.push(`<polyline points="${pts(arc)}" fill="none" stroke="${CLAY}" stroke-width="1.6"/>`);

// anchors for callouts
const A = {
  arcMid: P(-r * Math.cos(th / 2), Wb, r * Math.sin(th / 2)),
  phone: P(...Q((pu0 + pu1) / 2, py1, tb + pt)),
  stopper: P(...Q(0, Wb, tb + sh / 2)),
  cm: cmP, pivot: pvP, boxTop: P(...Q(u0 + B / 2, (y0 + y1) / 2, n1)),
  hinge: P(0, Wb, 0),
};
console.log(out.join('\n'));
const xsA = all.map(p => p[0]), ysA = all.map(p => p[1]);
console.error('bbox x', f(Math.min(...xsA)), f(Math.max(...xsA)), 'y', f(Math.min(...ysA)), f(Math.max(...ysA)));
console.error('theta', (th * 180 / Math.PI).toFixed(3));
console.error(JSON.stringify(Object.fromEntries(Object.entries(A).map(([k, v]) => [k, [f(v[0]), f(v[1])]]))));

// ---- callouts (style of the reference artboard, normalized: 13px / 700) ----
if (process.argv[5] === 'full') {
  const L = [];
  const dot = (p) => `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="2.6" fill="${INK}" stroke="#FFFFFF" stroke-width="1.2"/>`;
  const pl = (a, col = INK) => `<polyline points="${a.map(p => f(p[0]) + ',' + f(p[1])).join(' ')}" fill="none" stroke="${col}" stroke-width="0.8"/>`;
  L.push(`<g font-family="Manrope, sans-serif" font-size="13" font-weight="700" fill="${INK}">`);
  L.push(pl([A.phone, [160, 22], [8, 22]]), dot(A.phone), `<text x="8" y="16">уровень в телефоне</text>`);
  L.push(pl([A.cm, [240, 70], [340, 70]]), `<text x="340" y="48" text-anchor="end">центр тяжести</text>`, `<text x="340" y="64" text-anchor="end">над ребром</text>`);
  L.push(pl([A.stopper, [196, 154], [340, 154]]), dot(A.stopper), `<text x="340" y="148" text-anchor="end">упор у нижнего края</text>`);
  L.push(pl([A.arcMid, [100, 134], [8, 134]], CLAY), `<text x="8" y="128">θ = <tspan fill="${CLAY}">14,0°</tspan></text>`);
  L.push(`</g>`);
  const svg = `<svg width="348" height="158" viewBox="0 0 348 158" role="img" aria-label="Опыт с наклоном: доска поднята на 14 градусов и лежит на стопке книг; у нижнего края упор, к нему прижат брусок в пропорции шкафа, 1 к 4; на доске телефон с уровнем. Вертикаль через центр тяжести бруска проходит через ребро упора — брусок начинает опрокидываться." style="display:block">
<defs><filter id="softT" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter></defs>
${out.join('\n')}
${L.join('\n')}
</svg>`;
  require('fs').writeFileSync('tilt.svgfrag', svg);
}
