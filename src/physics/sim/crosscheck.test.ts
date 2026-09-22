// Two independent models must agree: Rapier (contact dynamics) vs Housner's rocking equation,
// both driven by the real El Centro 1940 record at the same floor motion.
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseRecord, scaleToPeak } from '../record';
import { intensityToAccel } from '../intensity';
import { rockingResponse } from '../housner';
import { simulateRoom, floorMotion, SIM_DT } from './world';
import { G } from '../units';

const record = parseRecord(JSON.parse(readFileSync('public/records/elcentro-ns.json', 'utf-8')));
const H = 2.0;
const RATIOS = [0.15, 0.25, 0.35, 0.5, 0.6]; // B/H
const INTENSITIES = [6, 7, 8, 9, 10];

describe('Rapier vs Housner on El Centro 1940', () => {
  it('agree on «fell / did not fall» in at least 95% of 25 cases', async () => {
    const rows: { I: number; ratio: number; rapier: string; housner: boolean; maxTiltDeg: number }[] = [];
    for (const I of INTENSITIES) {
      const accel = scaleToPeak(record.accelG, intensityToAccel(I)).map((a) => a * G);
      const motion = floorMotion(accel, record.dt);
      for (const ratio of RATIOS) {
        const d = ratio * H;
        // μ = 1: Housner's model has no sliding, so friction must not let the block slide either.
        const [sim] = await simulateRoom({
          items: [{ id: 'block', x: 0, z: 0, w: 1.0, d, H, angleDeg: 0, comH: H / 2, anchored: false }],
          floorDisp: motion.disp, dt: SIM_DT, dir: { x: 0, y: 1 }, mu: 1.0,
        });
        const housner = rockingResponse({ base: d, comH: H / 2 }, motion.accel, SIM_DT).overturned;
        rows.push({ I, ratio, rapier: sim.result, housner, maxTiltDeg: +sim.maxTiltDeg.toFixed(1) });
      }
    }
    // CROSSCHECK_OUT=path npm test → the full table for the README / the jury slide.
    if (process.env.CROSSCHECK_OUT) writeFileSync(process.env.CROSSCHECK_OUT, JSON.stringify(rows, null, 1));
    const disagree = rows.filter((r) => (r.rapier === 'fell') !== r.housner);
    expect(rows.length).toBe(25);
    expect(25 - disagree.length, `disagreements: ${JSON.stringify(disagree)}\nall: ${JSON.stringify(rows)}`)
      .toBeGreaterThanOrEqual(24);
  }, 600_000);
});
