import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseRecord } from './record';
import { makeBuilding, approxPeriod } from './building';
import { peakFloorAccelAt7, criticalIntensity, assessItem, assessRoom, detectBlockedSides } from './assess';
import type { Item, Room, Settings } from './types';

const elCentro = parseRecord(JSON.parse(readFileSync('public/records/elcentro-ns.json', 'utf-8')));
const nine = makeBuilding(9, approxPeriod(9));

// 300 × 420 cm bedroom, y down. Walls: 0 top, 1 right, 2 bottom (door), 3 left.
const vertices = [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 420 }, { x: 0, y: 420 }];
const floor = { kind: 'floor' } as const;
// Bed 160×200 against the top wall, pillow strip y 0…60, x 90…250.
const bed: Item = { id: 'bed', kind: 'bed', name: 'Кровать', x: 170, y: 100, w: 160, d: 200, height: 45, angle: 0, mount: floor, anchored: false, headSide: 'back' };
// IKEA PAX 100×58×236 in the top-left corner, doors facing the bed (+x).
const pax: Item = { id: 'pax', kind: 'wardrobe', name: 'PAX', x: 29, y: 50, w: 100, d: 58, height: 236, angle: -90, mount: floor, anchored: false, filling: 'even' };
// IKEA BILLY 80×28×202 on the right wall next to the door, facing −x.
const billy: Item = { id: 'billy', kind: 'bookshelf', name: 'BILLY', x: 286, y: 340, w: 80, d: 28, height: 202, angle: 90, mount: floor, anchored: false, filling: 'even' };
// IKEA MALM 4-drawer 80×48×100 on the left wall, lower half.
const malm: Item = { id: 'malm', kind: 'dresser', name: 'MALM', x: 24, y: 300, w: 80, d: 48, height: 100, angle: -90, mount: floor, anchored: false, filling: 'even' };
// IKEA HEMNES 90×37×197 on the left wall with a 15×15×30 vase on top.
const hemnes: Item = { id: 'hemnes', kind: 'bookshelf', name: 'HEMNES', x: 18.5, y: 200, w: 90, d: 37, height: 197, angle: -90, mount: floor, anchored: false, filling: 'even' };
const vase: Item = { id: 'vase', kind: 'vase', name: 'Ваза', x: 18.5, y: 200, w: 15, d: 15, height: 30, angle: 0, mount: { kind: 'onItem', supportId: 'hemnes' }, anchored: false };
// Shelf 80×25 on the top wall above the pillow, 150 cm up, on plasterboard plugs.
const shelf: Item = { id: 'shelf', kind: 'wallShelf', name: 'Полка', x: 170, y: 12.5, w: 80, d: 25, height: 20, angle: 0, mount: { kind: 'wall', wall: 0, offset: 130, mountHeight: 150, fastening: 'weak' }, anchored: false };

const room = (items: Item[]): Room => ({ id: 'r', name: 'Спальня', vertices, openings: [{ kind: 'door', wall: 2, offset: 30, width: 80 }], items });
const at = (intensity: number): Settings => ({ floor: 5, totalFloors: 9, intensity, buildingType: 'panel', recordId: 'elcentro-ns' });
const ctx = { pfa7G: 0.1 };

describe('floor motion from the building model', () => {
  it('critical intensity is 7.0 when the threshold equals the floor peak at 7 points', () => {
    expect(criticalIntensity(0.1234, 0.1234)).toBe(7);
    expect(criticalIntensity(0.2468, 0.1234)).toBeCloseTo(8, 12);
  });

  it('the ground floor feels exactly the ground motion: 0.1 g at 7 points (one component)', () => {
    const oneComponent = { ...elCentro, accelG2: undefined };
    expect(peakFloorAccelAt7(oneComponent, nine, 1)).toBeCloseTo(0.1, 9);
  });

  it('with both components the peak is that of the resultant |a(t)|, never below either component', () => {
    const both = peakFloorAccelAt7(elCentro, nine, 1);
    expect(both).toBeGreaterThanOrEqual(0.1);
    // Resultant of the two scaled ground records at the same instants, computed directly.
    const k = 0.1 / Math.max(...Array.from(elCentro.accelG, Math.abs));
    const direct = Math.max(...Array.from(elCentro.accelG, (a, i) => Math.hypot(a, elCentro.accelG2![i]) * k));
    expect(both).toBeCloseTo(direct, 3);
  });

  it('the 9th floor of a 9-storey building shakes harder than the ground under El Centro', () => {
    expect(peakFloorAccelAt7(elCentro, nine, 9)).toBeGreaterThan(0.1);
  });
});

describe('assessItem', () => {
  it('walls close the back and the right side of the wardrobe in the corner', () => {
    expect(detectBlockedSides(pax, room([pax]))).toEqual(['back', 'right']);
  });

  it('PAX tips forward onto the pillow → severity 4', () => {
    const a = assessItem(pax, room([bed, pax]), at(8.5), ctx);
    expect(a.mode).toBe('tips');
    expect(a.sides).toEqual(['front']);
    expect(a.thresholdG).toBeCloseTo(0.2458, 4);
    expect(a.criticalIntensity).toBeCloseTo(7 + Math.log2(0.29 / 1.18 / 0.1), 9);
    expect(a.fallsNow).toBe(true);
    expect(a.hitsPillow).toBe(true);
    expect(a.hitsBed).toBe(true);
    expect(a.severity).toBe(4);
  });

  it('below the critical intensity the hits are known but nothing falls', () => {
    const a = assessItem(pax, room([bed, pax]), at(8), ctx); // I_crit ≈ 8.30
    expect(a.fallsNow).toBe(false);
    expect(a.hitsPillow).toBe(true);
    expect(a.severity).toBe(0);
  });

  it('BILLY next to the door blocks the exit → severity 3', () => {
    const a = assessItem(billy, room([bed, billy]), at(8), ctx); // I_crit ≈ 7.47
    expect(a.thresholdG).toBeCloseTo(0.1386, 4);
    expect(a.blocksDoor).toBe(true);
    expect(a.hitsPillow).toBe(false);
    expect(a.severity).toBe(3);
  });

  it('MALM slides instead of tipping at μ = 0.4', () => {
    const a = assessItem(malm, room([malm]), at(10), ctx);
    expect(a.mode).toBe('slides');
    expect(a.slidesNow).toBe(true);
    expect(a.slideIntensity).toBeCloseTo(7 + Math.log2(0.4 / 0.1), 12);
    expect(a.zones).toEqual([]);
    expect(a.severity).toBe(0);
  });

  it('MALM stays put while the floor pushes less than friction holds', () => {
    const a = assessItem(malm, room([malm]), at(8.9), ctx); // floor 0.1·2^1.9 = 0.37 g < 0.4
    expect(a.mode).toBe('slides');
    expect(a.slidesNow).toBe(false);
  });

  it('anchored furniture is safe', () => {
    const a = assessItem({ ...pax, anchored: true }, room([bed, pax]), at(10), ctx);
    expect(a.mode).toBe('anchored');
    expect(a.zones).toEqual([]);
    expect(a.severity).toBe(0);
  });

  it('an item in a niche cannot tip', () => {
    const niche = room([{ ...malm, x: 150, y: 210, w: 300, d: 420, angle: 0 }]);
    expect(assessItem(niche.items[0], niche, at(10), ctx).mode).toBe('blocked');
  });

  it('the vase falls with the bookcase under it', () => {
    const r = room([hemnes, vase]);
    const support = assessItem(hemnes, r, at(8), ctx);
    const a = assessItem(vase, r, at(8), ctx);
    expect(support.fallsNow).toBe(true);
    expect(a.fallsNow).toBe(true);
    expect(a.cascadeFrom).toBe('hemnes');
    expect(a.zones.length).toBeGreaterThan(support.zones.length);
  });

  it('a shelf on weak plugs tears off at 0.3 g and lands on the pillow', () => {
    const r = room([bed, shelf]);
    const a = assessItem(shelf, r, at(9), ctx);
    expect(a.mode).toBe('wallFalls');
    expect(a.thresholdG).toBe(0.3);
    expect(a.criticalIntensity).toBeCloseTo(7 + Math.log2(3), 12);
    expect(a.hitsPillow).toBe(true);
    expect(a.severity).toBe(4);
    const anchoredShelf = { ...shelf, mount: { ...shelf.mount, fastening: 'anchor' as const } };
    expect(assessItem(anchoredShelf, room([bed, anchoredShelf]), at(10), ctx).mode).toBe('wallSafe');
  });
});

describe('assessRoom', () => {
  it('sorts by severity, then by critical intensity', () => {
    const { checklist } = assessRoom(room([bed, pax, billy, malm, hemnes, vase, shelf]), at(9), ctx);
    expect(checklist.map((a) => a.itemId)).toEqual(['pax', 'shelf', 'billy', 'hemnes', 'vase', 'bed', 'malm']);
  });
});

describe('a shelf hanging over the bed', () => {
  const hung = (over: Partial<Item>): Item => ({ ...shelf, ...over });

  it('is marked when the shelf hangs above the sleeping place', () => {
    const a = assessItem(shelf, room([bed, shelf]), at(7), ctx);
    expect(a.overBed).toBe(true);
  });

  it('is not marked for a shelf on another wall, or when it is on anchors', () => {
    // Bottom wall, far from the bed (bed reaches y = 200).
    const far = hung({ y: 407.5, mount: { kind: 'wall', wall: 2, offset: 130, mountHeight: 150, fastening: 'weak' } });
    expect(assessItem(far, room([bed, far]), at(7), ctx).overBed).toBe(false);
    const anchored = hung({ mount: { kind: 'wall', wall: 0, offset: 130, mountHeight: 150, fastening: 'anchor' } });
    expect(assessItem(anchored, room([bed, anchored]), at(7), ctx).overBed).toBe(false);
  });

  it('a floor item is never «over the bed», however close it stands', () => {
    expect(assessItem(pax, room([bed, pax]), at(9), ctx).overBed).toBe(false);
  });
});
