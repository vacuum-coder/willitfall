// «Тряхнуть»: the floor motion of the chosen storey under the real record, then the same Rapier
// simulation the tests check, recorded for playback. Runs off the main thread.

import { loadRecord, scaleToPeak, resample } from '../record';
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

/** Start of the SHAKE_SECONDS window with the most energy (Σa²). */
function strongestWindow(a: Float64Array, dt: number): number {
  const n = Math.min(a.length, Math.round(SHAKE_SECONDS / dt));
  let sum = 0;
  for (let i = 0; i < n; i++) sum += a[i] * a[i];
  let best = sum, start = 0;
  for (let i = n; i < a.length; i++) {
    sum += a[i] * a[i] - a[i - n] * a[i - n];
    if (sum > best) { best = sum; start = i - n + 1; }
  }
  return start;
}

self.onmessage = async (e: MessageEvent<ShakeRequest>) => {
  try {
    const q = e.data;
    const record = await loadRecord(q.recordId, q.base);
    const t = Array.from(record.accelG, (_, i) => i * record.dt);
    const ground = resample(t, Array.from(scaleToPeak(record.accelG, intensityToAccel(q.intensity))), DT).map((v) => v * G);
    const floorAcc = floorResponse(makeBuilding(q.storeys, q.T1), ground, DT, q.floor).accel;
    const start = strongestWindow(floorAcc, DT);
    const n = Math.min(floorAcc.length - start, Math.round(SHAKE_SECONDS / DT));
    const taper = Math.round(TAPER_S / DT);
    const win = Float64Array.from({ length: n }, (_, i) => {
      const w = i < taper ? 0.5 - 0.5 * Math.cos((Math.PI * i) / taper) : i > n - taper ? 0.5 - 0.5 * Math.cos((Math.PI * (n - i)) / taper) : 1;
      return floorAcc[start + i] * w;
    });
    let peak = 0;
    for (const v of floorAcc) peak = Math.max(peak, Math.abs(v));
    const motion = floorMotion(win, DT);
    const { outcomes, frames } = await simulateRoomRecorded({
      items: q.items, walls: q.walls, floorDisp: motion.disp, dt: 1 / 240, dir: q.dir,
    });
    const result: ShakeResult = {
      outcomes, frameDt: frames.dt, floor: frames.floor, poses: [...frames.poses],
      window: { from: start * DT, to: (start + n) * DT }, peakFloorG: peak / G,
    };
    (self as unknown as Worker).postMessage({ ok: true, result } satisfies ShakeResponse, [frames.floor.buffer, ...[...frames.poses.values()].map((p) => p.buffer)]);
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) } satisfies ShakeResponse);
  }
};
