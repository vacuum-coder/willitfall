// The whole «Тряхнуть» pipeline on the demo bedroom, exactly as the site runs it.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseRecord } from '../record';
import { runShake } from './shake';
import { PANEL_BEDROOM, DEFAULT_SETTINGS } from '../../data/presets';
import { periodFor } from '../../data/buildings';
import { assessRoom, peakFloorAccelAt7 } from '../assess';
import { makeBuilding } from '../building';
import { toSimItems, toSimWalls, worstDirection } from '../../three/useQuake';
import type { Item, Room } from '../types';

const record = parseRecord(JSON.parse(readFileSync('public/records/elcentro-ns.json', 'utf-8')));
// A shelf on plasterboard plugs above the pillow, 150 cm up — the case the formula flags at 0.3 g.
const shelf: Item = {
  id: 'shelf', kind: 'wallShelf', name: 'Полка', x: 100, y: 12.5, w: 80, d: 25, height: 20, angle: 0,
  mount: { kind: 'wall', wall: 0, offset: 60, mountHeight: 150, fastening: 'weak' }, anchored: false,
};
const room: Room = { ...PANEL_BEDROOM, items: [...PANEL_BEDROOM.items, shelf] };
const s = DEFAULT_SETTINGS;

async function shake(intensity: number) {
  const pfa7G = peakFloorAccelAt7(record, makeBuilding(s.totalFloors, periodFor(s.buildingType, s.totalFloors)), s.floor);
  const { assessments, checklist } = assessRoom(room, { ...s, intensity }, { pfa7G });
  const r = await runShake(record, {
    intensity, storeys: s.totalFloors, T1: periodFor(s.buildingType, s.totalFloors), floor: s.floor,
    items: toSimItems(room), walls: toSimWalls(room), dir: worstDirection(room, checklist),
  });
  const sim = Object.fromEntries(r.outcomes.map((o) => [o.id, o.result]));
  const formula = Object.fromEntries(assessments.map((a) => [a.itemId, a.fallsNow]));
  return { sim, formula, r };
}

describe('«Тряхнуть» on the demo bedroom (El Centro, 8th of 9 floors, both components)', () => {
  it('at the design 9 points: the wardrobe, the bookcase and the weak shelf fall, the anchored mirror stays', async () => {
    const { sim, formula } = await shake(9);
    expect(sim).toMatchObject({ pax: 'fell', billy: 'fell', shelf: 'fell', mirror: 'stood', bed: 'stood' });
    expect(formula).toMatchObject({ pax: true, billy: true, shelf: true, mirror: false });
  }, 120_000);

  it('at 5.5 points nothing falls and the shelf stays on the wall', async () => {
    const { sim } = await shake(5.5);
    for (const id of ['pax', 'billy', 'malm', 'mirror', 'shelf']) expect(sim[id], id).toBe('stood');
  }, 120_000);

  it('never drops what the formula keeps standing (the formula is the cautious one)', async () => {
    for (const I of [6, 7, 8]) {
      const { sim, formula } = await shake(I);
      for (const [id, falls] of Object.entries(formula)) if (!falls && id !== 'malm') expect(sim[id], `${id} at ${I}`).not.toBe('fell');
    }
  }, 300_000);

  it('the floor ends the shake at rest where it started', async () => {
    const { r } = await shake(9);
    const n = r.floor.length / 2;
    expect(Math.hypot(r.floor[2 * (n - 1)], r.floor[2 * (n - 1) + 1])).toBeLessThan(0.01);
  }, 120_000);
});
