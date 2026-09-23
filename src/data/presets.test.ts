import { describe, it, expect } from 'vitest';
import { ROOM_PRESETS, PANEL_BEDROOM } from './presets';
import { isValid, isValidRoom, wallFrames } from '../state/placement';
import { itemPolygon, polyIntersects, doorZone } from '../physics/geometry';

describe('ready-made rooms', () => {
  it('there is more than one to choose from and the demo bedroom is among them', () => {
    expect(ROOM_PRESETS.length).toBeGreaterThan(3);
    expect(ROOM_PRESETS[0].room.id).toBe(PANEL_BEDROOM.id);
    expect(new Set(ROOM_PRESETS.map((p) => p.room.id)).size).toBe(ROOM_PRESETS.length);
  });
});

describe.each(ROOM_PRESETS)('room «$label»', ({ room }) => {
  it('has a usable outline, a door and a bed', () => {
    expect(isValidRoom(room.vertices)).toBe(true);
    expect(room.openings.some((o) => o.kind === 'door')).toBe(true);
    expect(room.items.some((i) => i.kind === 'bed')).toBe(true);
  });

  it('every piece stands inside the room and clear of the others', () => {
    for (const item of room.items) expect([item.name, isValid(item, room)]).toEqual([item.name, true]);
  });

  it('nothing stands in the doorway', () => {
    // The demo bedroom keeps its bookcase by the door on purpose: that is the case the app warns about.
    if (room.id === PANEL_BEDROOM.id) return;
    const doors = room.openings.filter((o) => o.kind === 'door').map((o) => doorZone(room.vertices, o));
    for (const item of room.items.filter((i) => i.mount.kind === 'floor')) {
      expect([item.name, doors.some((z) => polyIntersects(z, itemPolygon(item)))]).toEqual([item.name, false]);
    }
  });

  it('openings fit on their wall', () => {
    const frames = wallFrames(room.vertices);
    for (const o of room.openings) {
      expect(o.wall).toBeLessThan(frames.length);
      expect(o.offset + o.width).toBeLessThanOrEqual(frames[o.wall].len);
    }
  });
});
