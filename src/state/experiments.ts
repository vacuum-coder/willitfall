// The tilt experiment table («Проверка физики»): the user's own measurements, kept only in their browser.

export interface Experiment { id: string; name: string; B: number; H: number; measured: number[] }

export const MAX_ROWS = 10;
export const TARGET_ERROR = 0.1;
const KEY = 'furniture-quake:experiments';

/** Tilting the base by θ equals a horizontal acceleration g·tanθ, so a uniform block tips at θ = arctan(B / H). */
export const predictedAngle = (B: number, H: number): number => (Math.atan(B / H) * 180) / Math.PI;

export function addMeasurement(rows: Experiment[], what: { name: string; B: number; H: number }, angle: number): Experiment[] {
  const i = rows.findIndex((r) => r.name === what.name && r.B === what.B && r.H === what.H);
  if (i >= 0) return rows.map((r, k) => (k === i ? { ...r, measured: [...r.measured, angle] } : r));
  const next = [...rows, { id: `e${Date.now().toString(36)}${rows.length}`, ...what, measured: [angle] }];
  return next.slice(-MAX_ROWS);
}

export function rowStats(r: Experiment): { predicted: number; mean: number | null; error: number | null } {
  const predicted = predictedAngle(r.B, r.H);
  if (!r.measured.length) return { predicted, mean: null, error: null };
  const mean = r.measured.reduce((s, v) => s + v, 0) / r.measured.length;
  return { predicted, mean, error: Math.abs(mean - predicted) / predicted };
}

/** Average relative error over the rows that have at least one measurement. */
export function meanError(rows: Experiment[]): number | null {
  const errors = rows.map((r) => rowStats(r).error).filter((e): e is number => e !== null);
  return errors.length ? errors.reduce((s, v) => s + v, 0) / errors.length : null;
}

const valid = (r: Partial<Experiment>): r is Experiment =>
  typeof r.id === 'string' && typeof r.name === 'string' && typeof r.B === 'number' && r.B > 0 &&
  typeof r.H === 'number' && r.H > 0 && Array.isArray(r.measured) && r.measured.every((v) => typeof v === 'number');

export function loadExperiments(store: Storage | undefined = globalThis.localStorage): Experiment[] {
  try {
    const raw = store?.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) && parsed.every(valid) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveExperiments(rows: Experiment[], store: Storage | undefined = globalThis.localStorage): void {
  try {
    store?.setItem(KEY, JSON.stringify(rows));
  } catch {
    // Private mode: the table works for this visit only.
  }
}
