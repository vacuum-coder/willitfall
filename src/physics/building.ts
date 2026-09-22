// Shear-building model: n storeys, one lumped slab mass per storey, uniform stiffness.
// Equation of motion in coordinates relative to the ground:  M ü + C u̇ + K u = −M·1·a_g(t).
// Integrated with Newmark's average-acceleration method (γ = ½, β = ¼ — unconditionally stable,
// no numerical damping); the tridiagonal system is solved each step by the Thomas algorithm.

export interface Building {
  n: number;
  m: number;
  k: number;
  omega1: number;
  omega2: number;
  /** Rayleigh damping C = a0·M + a1·K. */
  a0: number;
  a1: number;
}

/** Approximate fundamental period, ASCE 7-16 Eq. 12.8-7: Ta = 0.0488·hn^0.75 (hn in metres). */
export const approxPeriod = (storeys: number, storeyHeight = 2.8): number =>
  0.0488 * (storeys * storeyHeight) ** 0.75;

/**
 * Uniform shear building tuned to a given first-mode period. For a fixed–free chain of equal
 * masses and springs ω_j = 2√(k/m)·sin((2j−1)π / (2(2n+1))), which gives k from T1 exactly.
 */
export function makeBuilding(storeys: number, T1: number, zeta = 0.05): Building {
  const n = storeys, m = 1, omega1 = (2 * Math.PI) / T1;
  const s = (j: number) => Math.sin(((2 * j - 1) * Math.PI) / (2 * (2 * n + 1)));
  const k = m * (omega1 / (2 * s(1))) ** 2;
  const omega2 = n > 1 ? 2 * Math.sqrt(k / m) * s(2) : omega1;
  // Rayleigh damping ζ at ω1 and ω2; a single storey uses mass-proportional 2ζω1.
  const a0 = n > 1 ? (2 * zeta * omega1 * omega2) / (omega1 + omega2) : 2 * zeta * omega1;
  const a1 = n > 1 ? (2 * zeta) / (omega1 + omega2) : 0;
  return { n, m, k, omega1, omega2, a0, a1 };
}

/**
 * Response of one floor to ground acceleration ag (m/s²) sampled at dt.
 * floor 1 = ground-floor slab (moves with the ground); floor f ≥ 2 stands on slab f − 1,
 * i.e. DOF f − 2; the roof is floor n + 1.
 * Returns absolute acceleration (m/s²) and displacement relative to the ground (m).
 */
export function floorResponse(
  b: Building,
  ag: Float64Array,
  dt: number,
  floor: number,
): { accel: Float64Array; disp: Float64Array } {
  const steps = ag.length, N = b.n, beta = 0.25, gamma = 0.5;
  if (floor <= 1) return { accel: Float64Array.from(ag), disp: new Float64Array(steps) };
  const dof = Math.min(floor - 2, N - 1);

  // K is tridiagonal: diagonal 2k (k for the top slab), off-diagonal −k. M = m·I.
  const kd = Array.from({ length: N }, (_, i) => (i === N - 1 ? b.k : 2 * b.k));
  const ko = -b.k;
  const c1 = gamma / (beta * dt), m1 = 1 / (beta * dt * dt);
  // Effective stiffness K̂ = K + c1·C + m1·M (Chopra, Dynamics of Structures, Table 5.4.2).
  const ed = kd.map((kv) => kv + c1 * (b.a0 * b.m + b.a1 * kv) + m1 * b.m);
  const eo = ko + c1 * b.a1 * ko;

  let u = new Float64Array(N), v = new Float64Array(N), a = new Float64Array(N).fill(-ag[0]);
  let un = new Float64Array(N), vn = new Float64Array(N), an = new Float64Array(N);
  const mu = new Float64Array(N), cu = new Float64Array(N), rhs = new Float64Array(N);
  const accel = new Float64Array(steps), disp = new Float64Array(steps);
  accel[0] = ag[0];

  const Kmul = (x: Float64Array, i: number) =>
    kd[i] * x[i] + (i > 0 ? ko * x[i - 1] : 0) + (i < N - 1 ? ko * x[i + 1] : 0);

  for (let s = 1; s < steps; s++) {
    for (let i = 0; i < N; i++) {
      mu[i] = m1 * u[i] + (1 / (beta * dt)) * v[i] + (1 / (2 * beta) - 1) * a[i];
      cu[i] = c1 * u[i] + (gamma / beta - 1) * v[i] + dt * (gamma / (2 * beta) - 1) * a[i];
    }
    // p̂ = p + M·mu + C·cu, with p = −m·a_g and C·cu = a0·M·cu + a1·K·cu.
    for (let i = 0; i < N; i++) rhs[i] = -b.m * ag[s] + b.m * mu[i] + b.a0 * b.m * cu[i] + b.a1 * Kmul(cu, i);
    thomas(ed, eo, rhs, un);
    for (let i = 0; i < N; i++) {
      an[i] = m1 * (un[i] - u[i]) - (1 / (beta * dt)) * v[i] - (1 / (2 * beta) - 1) * a[i];
      vn[i] = v[i] + dt * ((1 - gamma) * a[i] + gamma * an[i]);
    }
    [u, un] = [un, u];
    [v, vn] = [vn, v];
    [a, an] = [an, a];
    accel[s] = a[dof] + ag[s];
    disp[s] = u[dof];
  }
  return { accel, disp };
}

/** Thomas algorithm for a symmetric tridiagonal system with constant off-diagonal o; writes into out. */
function thomas(d: number[], o: number, r: Float64Array, out: Float64Array): void {
  const n = d.length, x = new Float64Array(n), dd = new Float64Array(n);
  dd[0] = d[0];
  x[0] = r[0];
  for (let i = 1; i < n; i++) {
    const w = o / dd[i - 1];
    dd[i] = d[i] - w * o;
    x[i] = r[i] - w * x[i - 1];
  }
  out[n - 1] = x[n - 1] / dd[n - 1];
  for (let i = n - 2; i >= 0; i--) out[i] = (x[i] - o * out[i + 1]) / dd[i];
}
