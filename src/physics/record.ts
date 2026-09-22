// Ground-motion record processing: parse, resample, scale, integrate, baseline-correct.

/** Parses whitespace-separated «time accel» lines; lines that are not two numbers are skipped. */
export function parseTwoColumn(text: string): { t: number[]; a: number[] } {
  const t: number[] = [], a: number[] = [];
  for (const line of text.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/).map(Number);
    if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      t.push(parts[0]);
      a.push(parts[1]);
    }
  }
  return { t, a };
}

/** Linear interpolation onto a uniform grid with step dt starting at t[0]. */
export function resample(t: number[], a: number[], dt: number): Float64Array {
  const n = Math.floor((t[t.length - 1] - t[0]) / dt + 1e-9) + 1;
  const out = new Float64Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const ti = t[0] + i * dt;
    while (j < t.length - 2 && t[j + 1] < ti) j++;
    const f = (ti - t[j]) / (t[j + 1] - t[j]);
    out[i] = a[j] + Math.min(1, Math.max(0, f)) * (a[j + 1] - a[j]);
  }
  return out;
}

export const peakAbs = (x: ArrayLike<number>): number => {
  let m = 0;
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]));
  return m;
};

export function scaleToPeak(a: Float64Array, targetPeak: number): Float64Array {
  const k = targetPeak / peakAbs(a);
  return a.map((v) => v * k);
}

/** Trapezoid rule, zero initial velocity and displacement. */
export function integrate(accel: Float64Array, dt: number): { vel: Float64Array; disp: Float64Array } {
  const n = accel.length, vel = new Float64Array(n), disp = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    vel[i] = vel[i - 1] + 0.5 * dt * (accel[i - 1] + accel[i]);
    disp[i] = disp[i - 1] + 0.5 * dt * (vel[i - 1] + vel[i]);
  }
  return { vel, disp };
}

/** Fits v(t) ≈ c0 + c1·t + c2·t² by least squares and subtracts its derivative from a(t). */
export function baselineCorrect(accel: Float64Array, dt: number): Float64Array {
  const { vel } = integrate(accel, dt);
  const n = vel.length;
  const S = [0, 0, 0, 0, 0], R = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const t = i * dt, p = [1, t, t * t, t ** 3, t ** 4];
    for (let k = 0; k < 5; k++) S[k] += p[k];
    R[0] += vel[i];
    R[1] += vel[i] * t;
    R[2] += vel[i] * t * t;
  }
  const A = [[S[0], S[1], S[2]], [S[1], S[2], S[3]], [S[2], S[3], S[4]]];
  const [, c1, c2] = solve3(A, R);
  return accel.map((v, i) => v - (c1 + 2 * c2 * i * dt));
}

/** Gauss–Jordan elimination with partial pivoting for a 3×3 system. */
function solve3(A: number[][], b: number[]): number[] {
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k];
    }
  }
  return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
}

/** A real accelerogram as stored in public/records/*.json (produced by scripts/fetch-*). */
export interface GroundRecord {
  id: string;
  name: string;
  dt: number;
  accelG: Float64Array;
  peakG: number;
  /** The other horizontal component on the same time grid (the first is the stronger one). */
  accelG2?: Float64Array;
  source: string;
  citation: string;
  note: string;
}

/** Validates the JSON shape; throws instead of letting a broken record reach the solver. */
export function parseRecord(json: unknown): GroundRecord {
  const r = json as Partial<Record<keyof GroundRecord, unknown>>;
  const ok =
    typeof r.id === 'string' &&
    typeof r.dt === 'number' && r.dt > 0 &&
    Array.isArray(r.accelG) && r.accelG.length > 1 &&
    r.accelG.every((v) => typeof v === 'number' && Number.isFinite(v)) &&
    typeof r.peakG === 'number';
  if (!ok) throw new Error(`invalid ground-motion record ${String(r.id)}`);
  const a2 = r.accelG2;
  if (a2 !== undefined && !(Array.isArray(a2) && a2.length === (r.accelG as number[]).length && a2.every((v) => Number.isFinite(v)))) {
    throw new Error(`invalid second component in record ${String(r.id)}`);
  }
  return {
    id: r.id as string,
    name: String(r.name ?? r.id),
    dt: r.dt as number,
    accelG: Float64Array.from(r.accelG as number[]),
    peakG: r.peakG as number,
    ...(a2 ? { accelG2: Float64Array.from(a2 as number[]) } : {}),
    source: String(r.source ?? ''),
    citation: String(r.citation ?? ''),
    note: String(r.note ?? ''),
  };
}

/** Loads a record by id from /records/<id>.json. */
export async function loadRecord(id: string, base: string = import.meta.env.BASE_URL): Promise<GroundRecord> {
  const res = await fetch(`${base}records/${id}.json`);
  if (!res.ok) throw new Error(`record ${id}: HTTP ${res.status}`);
  return parseRecord(await res.json());
}
