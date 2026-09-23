import { describe, it, expect } from 'vitest';
import { safeBedSpot } from './safeSpot';
import { initialState } from './roomReducer';
import { PANEL_BEDROOM, DEFAULT_SETTINGS } from '../data/presets';
import { assessRoom } from '../physics/assess';
import { itemPolygon, polyIntersects, doorZone, type Vec } from '../physics/geometry';
import type { Item, Room } from '../physics/types';
import { contains } from './placement';

/** Zones of everything that falls at the current setting — what the bed must stay clear of. */
const dangerZones = (room: Room, pfa7G: number): Vec[][] =>
  assessRoom(room, DEFAULT_SETTINGS, { pfa7G }).assessments.filter((a) => a.fallsNow).flatMap((a) => a.zones);

const bedOf = (room: Room) => room.items.find((i) => i.kind === 'bed')!;
const at = (bed: Item, spot: { x: number; y: number; angle: number }): Item => ({ ...bed, ...spot });

// 0.33 g on the floor — the demo flat: El Centro, 8th floor of 9, 9 points.
const PFA7 = 0.3342;

describe('safe place for the bed', () => {
  it('finds a spot in the demo bedroom where nothing falls on the bed', () => {
    const room = initialState(PANEL_BEDROOM).room;
    const zones = dangerZones(room, PFA7);
    const bed = bedOf(room);
    expect(zones.some((z) => polyIntersects(z, itemPolygon(bed)))).toBe(true);

    const spot = safeBedSpot(room, zones, bed.id);
    expect(spot).not.toBeNull();
    const poly = itemPolygon(at(bed, spot!));
    expect(zones.some((z) => polyIntersects(z, poly))).toBe(false);
    expect(contains(room.vertices, poly)).toBe(true);
    expect(room.items.filter((i) => i.id !== bed.id && i.mount.kind === 'floor')
      .some((o) => polyIntersects(poly, itemPolygon(o)))).toBe(false);
    expect(room.openings.filter((o) => o.kind === 'door')
      .some((o) => polyIntersects(poly, doorZone(room.vertices, o)))).toBe(false);
  });

  it('suggests nothing when the bed is already out of every zone', () => {
    const room = initialState(PANEL_BEDROOM).room;
    const zones = dangerZones(room, PFA7);
    const bed = bedOf(room);
    const safe = safeBedSpot(room, zones, bed.id)!;
    const moved: Room = { ...room, items: room.items.map((i) => (i.id === bed.id ? at(i, safe) : i)) };
    expect(safeBedSpot(moved, dangerZones(moved, PFA7), bed.id)).toBeNull();
  });

  it('nothing to suggest when every corner of the room is in a zone', () => {
    const room = initialState(PANEL_BEDROOM).room;
    const bed = bedOf(room);
    const whole = [room.vertices];
    expect(safeBedSpot(room, whole, bed.id)).toBeNull();
  });

  it('turns the bed when it only fits across the room', () => {
    // 4.2 × 1.7 m: the 160 × 200 bed does not fit along the room, only across it.
    const room: Room = {
      id: 'narrow', name: 'Узкая', vertices: [{ x: 0, y: 0 }, { x: 420, y: 0 }, { x: 420, y: 170 }, { x: 0, y: 170 }],
      openings: [], items: [bedOf(initialState(PANEL_BEDROOM).room)],
    };
    const bed = bedOf(room);
    const spot = safeBedSpot(room, [], bed.id);
    expect(spot).not.toBeNull();
    expect(Math.abs(spot!.angle) % 180).toBe(90);
  });
});
