// «Тряхнуть»: the floor motion of the chosen storey under the real record (both horizontal components), then the
// same Rapier simulation the tests check, recorded for playback. Runs in shake.worker.ts, tested in shake.test.ts.

import { resample, peakAbs, type GroundRecord } from '../record';
import { makeBuilding, floorResponse } from '../building';
import { intensityToAccel } from '../intensity';
import { G } from '../units';
import { simulateRoomRecorded, floorMotion, type SimItem, type SimWall, type SimOutcome } from './world';

export const SHAKE_SECONDS = 10;
const TAPER_S = 0.5;
const DT = 0.001;

export interface ShakeRequest {
  recordId: string; base: string; intensity: number; storeys: number; T1: number; floor: number;
  items: SimItem[]; walls: SimWall[]; dir: { x: number; y: number };
}
export interface ShakeResult {
  outcomes: SimOutcome[];
  frameDt: number;
  floor: Float32Array;
  poses: [string, Float32Array][];
  window: { from: number; to: number };
  peakFloorG: number;
}
export type ShakeResponse = { ok: true; result: ShakeResult } | { ok: false; error: string };

/** Start of the SHAKE_SECONDS window with the most energy (Σ a₁² + a₂² over both horizontal components). */
function strongestWindow(a: Float64Array, b: Float64Array | null, dt: number): number {
  const e = (i: number) => a[i] * a[i] + (b ? b[i] * b[i] : 0);
  const n = Math.min(a.length, Math.round(SHAKE_SECONDS / dt));
  let sum = 0;
  for (let i = 0; i < n; i++) sum += e(i);
  let best = sum, start = 0;
  for (let i = n; i < a.length; i++) {
    sum += e(i) - e(i - n);
    if (sum > best) { best = sum; start = i - n + 1; }
  }
  return start;
}

/** The whole «Тряхнуть» pipeline for one room. */
export async function runShake(record: GroundRecord, q: Omit<ShakeRequest, 'recordId' | 'base'>): Promise<ShakeResult> {
  const t = Array.from(record.accelG, (_, i) => i * record.dt);
  // Both components get the same factor: the stronger one reaches the chosen intensity, their real ratio stays.
  const k = (intensityToAccel(q.intensity) / peakAbs(record.accelG)) * G;
  const building = makeBuilding(q.storeys, q.T1);
  const floorOf = (a: Float64Array) => floorResponse(building, resample(t, Array.from(a, (v) => v * k), DT), DT, q.floor).accel;
  const floorAcc = floorOf(record.accelG);
  const floorAcc2 = record.accelG2 ? floorOf(record.accelG2) : null;
  const start = strongestWindow(floorAcc, floorAcc2, DT);
  const n = Math.min(floorAcc.length - start, Math.round(SHAKE_SECONDS / DT));
  const taper = Math.round(TAPER_S / DT);
  const window = (a: Float64Array) => Float64Array.from({ length: n }, (_, i) => {
    const w = i < taper ? 0.5 - 0.5 * Math.cos((Math.PI * i) / taper) : i > n - taper ? 0.5 - 0.5 * Math.cos((Math.PI * (n - i)) / taper) : 1;
    return a[start + i] * w;
  });
  let peak = 0;
  for (const v of floorAcc) peak = Math.max(peak, Math.abs(v));
  const motion = floorMotion(window(floorAcc), DT);
  const motion2 = floorAcc2 ? floorMotion(window(floorAcc2), DT) : null;
  // The stronger component along the most dangerous item's tipping direction, the other one across it.
  const { outcomes, frames } = await simulateRoomRecorded({
    items: q.items, walls: q.walls, floorDisp: motion.disp, floorDisp2: motion2?.disp, dt: 1 / 240, dir: q.dir,
  });
  const result: ShakeResult = {
    outcomes, frameDt: frames.dt, floor: frames.floor, poses: [...frames.poses],
    window: { from: start * DT, to: (start + n) * DT }, peakFloorG: peak / G,
  };
  return result;
}
