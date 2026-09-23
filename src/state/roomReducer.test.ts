import { describe, it, expect } from 'vitest';
import polygonClipping from 'polygon-clipping';
import { roomReducer, initialState, type AppState, type Action } from './roomReducer';
import { doorAt } from './placement';
import { PANEL_BEDROOM } from '../data/presets';
import { itemPolygon, polyIntersects, polyArea, type Vec } from '../physics/geometry';

const start = (): AppState => initialState(PANEL_BEDROOM);
const run = (s: AppState, ...actions: Action[]) => actions.reduce(roomReducer, s);
const item = (s: AppState, id: string) => s.room.items.find((i) => i.id === id)!;
const lastItem = (s: AppState) => s.room.items[s.room.items.length - 1];
const ring = (v: Vec[]) => [v.map((q) => [q.x, q.y] as [number, number])];
const inside = (s: AppState, id: string) => {
  const p = itemPolygon(item(s, id));
  const parts = polygonClipping.intersection(ring(p), ring(s.room.vertices));
  const area = parts.reduce((t, pl) => t + polyArea(pl[0].slice(0, -1).map(([x, y]) => ({ x, y }))), 0);
  return area >= polyArea(p) - 1;
};
const overlapsAny = (s: AppState, id: string) =>
  s.room.items
    .filter((o) => o.id !== id && o.mount.kind === 'floor')
    .some((o) => polyIntersects(itemPolygon(item(s, id)), itemPolygon(o)));

describe('settings', () => {
  it('intensity: 5.0–10.0, step 0.1', () => {
    expect(run(start(), { type: 'SET_INTENSITY', value: 12 }).settings.intensity).toBe(10);
    expect(run(start(), { type: 'SET_INTENSITY', value: 4 }).settings.intensity).toBe(5);
    expect(run(start(), { type: 'SET_INTENSITY', value: 7.26 }).settings.intensity).toBe(7.3);
  });

  it('floors: 1–40, floor never above the number of floors', () => {
    expect(run(start(), { type: 'SET_FLOOR', floor: 12, totalFloors: 9 }).settings).toMatchObject({ floor: 9, totalFloors: 9 });
    expect(run(start(), { type: 'SET_FLOOR', floor: 3, totalFloors: 55 }).settings.totalFloors).toBe(40);
    expect(run(start(), { type: 'SET_FLOOR', floor: 0, totalFloors: 5 }).settings.floor).toBe(1);
  });

  it('building type and record', () => {
    const s = run(start(), { type: 'SET_BUILDING_TYPE', value: 'monolith' }, { type: 'SET_RECORD', id: 'almaty-2024-kndc' });
    expect(s.settings.buildingType).toBe('monolith');
    expect(s.settings.recordId).toBe('almaty-2024-kndc');
  });
});

describe('moving furniture', () => {
  it('snaps to a 5 cm grid away from walls', () => {
    const s = run(start(), { type: 'MOVE_ITEM', id: 'billy', x: 152, y: 292 });
    expect(item(s, 'billy')).toMatchObject({ x: 150, y: 290, angle: 90 });
  });

  it('sticks to a wall and turns its back to it', () => {
    const s = run(start(), { type: 'MOVE_ITEM', id: 'malm', x: 270, y: 251 });
    expect(item(s, 'malm')).toMatchObject({ x: 276, y: 250, angle: 90 });
  });

  it('stays inside the room', () => {
    const s = run(start(), { type: 'MOVE_ITEM', id: 'billy', x: 150, y: 600 });
    expect(inside(s, 'billy')).toBe(true);
  });

  it('stops at other furniture instead of going through it', () => {
    const s = run(start(), { type: 'MOVE_ITEM', id: 'billy', x: 150, y: 290 }, { type: 'MOVE_ITEM', id: 'billy', x: 100, y: 100 });
    expect(overlapsAny(s, 'billy')).toBe(false);
    expect(item(s, 'billy').y).toBeLessThan(290);
  });

  it('rotates about the centre, any angle', () => {
    const s = run(start(), { type: 'MOVE_ITEM', id: 'billy', x: 150, y: 290 }, { type: 'SET_ANGLE', id: 'billy', angle: 405 });
    expect(item(s, 'billy')).toMatchObject({ x: 150, y: 290, angle: 45 });
  });

  it('refuses a rotation that would push the item through a wall', () => {
    const s = run(start(), { type: 'SET_ANGLE', id: 'pax', angle: 0 });
    expect(item(s, 'pax').angle).toBe(90);
  });

  it('resizes within limits: at least 10 cm, at most 300 cm high', () => {
    const s = run(start(), { type: 'MOVE_ITEM', id: 'billy', x: 150, y: 290 }, { type: 'RESIZE_ITEM', id: 'billy', w: 5, height: 400 });
    expect(item(s, 'billy')).toMatchObject({ w: 10, height: 300 });
  });

  it('a bigger size is pulled back inside the room', () => {
    const s = run(start(), { type: 'RESIZE_ITEM', id: 'billy', d: 60 });
    expect(item(s, 'billy').d).toBe(60);
    expect(inside(s, 'billy')).toBe(true);
    expect(overlapsAny(s, 'billy')).toBe(false);
  });
});

describe('adding, stacking, walls', () => {
  it('adds a catalogue item against a free wall', () => {
    const s = run(start(), { type: 'ADD_ITEM', productKey: 'ikea-hemnes' });
    const added = lastItem(s);
    expect(added).toMatchObject({ name: 'Стеллаж', productKey: 'ikea-hemnes', w: 90, d: 37, height: 197 });
    expect(s.selectedId).toBe(added.id);
    expect(inside(s, added.id)).toBe(true);
    expect(overlapsAny(s, added.id)).toBe(false);
  });

  it('adds a custom item with the user’s own measurements', () => {
    const s = run(start(), { type: 'ADD_ITEM', custom: { kind: 'wardrobe', name: 'Мой шкаф', w: 120, d: 60, height: 210 } });
    expect(lastItem(s)).toMatchObject({ name: 'Мой шкаф', w: 120, d: 60, height: 210 });
  });

  it('puts a vase on the dresser only when its centre is on the top', () => {
    let s = run(start(), { type: 'ADD_ITEM', custom: { kind: 'vase', name: 'Ваза', w: 15, d: 15, height: 30 } });
    const vase = lastItem(s).id;
    s = run(s, { type: 'PLACE_ON', id: vase, supportId: 'malm' });
    expect(item(s, vase).mount.kind).toBe('floor'); // not on the top yet
    s = run(s, { type: 'MOVE_ITEM', id: vase, x: 24, y: 310 }, { type: 'PLACE_ON', id: vase, supportId: 'malm' });
    expect(item(s, vase).mount).toEqual({ kind: 'onItem', supportId: 'malm' });
  });

  it('moving the support carries what stands on it; deleting it drops it to the floor', () => {
    let s = run(start(), { type: 'ADD_ITEM', custom: { kind: 'vase', name: 'Ваза', w: 15, d: 15, height: 30 } });
    const vase = lastItem(s).id;
    s = run(s, { type: 'MOVE_ITEM', id: vase, x: 24, y: 310 }, { type: 'PLACE_ON', id: vase, supportId: 'malm' });
    s = run(s, { type: 'MOVE_ITEM', id: 'malm', x: 24, y: 330 });
    expect(item(s, vase)).toMatchObject({ x: 24, y: 330 });
    s = run(s, { type: 'DELETE_ITEM', id: 'malm' });
    expect(s.room.items.some((i) => i.id === 'malm')).toBe(false);
    expect(item(s, vase).mount).toEqual({ kind: 'floor' });
  });

  it('mounts a shelf on a wall at the given offset and height', () => {
    let s = run(start(), { type: 'ADD_ITEM', custom: { kind: 'wallShelf', name: 'Полка', w: 80, d: 25, height: 20 } });
    const shelf = lastItem(s);
    expect(shelf.mount.kind).toBe('wall');
    s = run(s, { type: 'MOUNT_ON_WALL', id: shelf.id, wall: 0, offset: 60, mountHeight: 150, fastening: 'weak' });
    expect(item(s, shelf.id)).toMatchObject({
      x: 100, y: 12.5, angle: 0,
      mount: { kind: 'wall', wall: 0, offset: 60, mountHeight: 150, fastening: 'weak' },
    });
    s = run(s, { type: 'SET_FASTENING', id: shelf.id, fastening: 'anchor' });
    expect(item(s, shelf.id).mount).toMatchObject({ fastening: 'anchor' });
  });

  it('a second shelf is hung next to the first, not on top of it', () => {
    const shelf = { kind: 'wallShelf', name: 'Полка', w: 80, d: 25, height: 20 } as const;
    const s = run(start(), { type: 'ADD_ITEM', custom: shelf }, { type: 'ADD_ITEM', custom: shelf });
    const [a, b] = s.room.items.slice(-2).map((i) => i.mount);
    if (a.kind !== 'wall' || b.kind !== 'wall') throw new Error('not on a wall');
    const apart = a.wall !== b.wall || a.offset + 80 <= b.offset || b.offset + 80 <= a.offset;
    expect(apart).toBe(true);
  });

  it('taking an item off its support puts it on the floor next to it', () => {
    let s = run(start(), { type: 'ADD_ITEM', custom: { kind: 'vase', name: 'Ваза', w: 15, d: 15, height: 30 } });
    const vase = lastItem(s).id;
    s = run(s, { type: 'MOVE_ITEM', id: vase, x: 24, y: 310 }, { type: 'PLACE_ON', id: vase, supportId: null });
    expect(item(s, vase).mount).toEqual({ kind: 'floor' });
    expect(overlapsAny(s, vase)).toBe(false);
    expect(inside(s, vase)).toBe(true);
  });

  it('anchor, filling, bed head side, selection', () => {
    const s = run(
      start(),
      { type: 'TOGGLE_ANCHOR', id: 'pax' },
      { type: 'SET_FILLING', id: 'pax', filling: 'top' },
      { type: 'SET_BED_HEAD', id: 'bed', side: 'left' },
      { type: 'SELECT_ITEM', id: 'pax' },
    );
    expect(item(s, 'pax')).toMatchObject({ anchored: true, filling: 'top' });
    expect(item(s, 'bed').headSide).toBe('left');
    expect(s.selectedId).toBe('pax');
    expect(run(s, { type: 'DELETE_ITEM', id: 'pax' }).selectedId).toBeNull();
  });
});

describe('room shape and door', () => {
  it('door offset stays on its wall', () => {
    const s = run(start(), { type: 'SET_DOOR', wall: 2, offset: 1000, width: 80 });
    expect(s.room.openings.find((o) => o.kind === 'door')).toMatchObject({ wall: 2, offset: 220, width: 80 });
  });

  it('moves a corner', () => {
    const s = run(start(), { type: 'MOVE_VERTEX', index: 2, to: { x: 300, y: 480 } });
    expect(s.room.vertices[2]).toEqual({ x: 300, y: 480 });
  });

  it('rejects walls shorter than 50 cm and self-intersections', () => {
    expect(run(start(), { type: 'MOVE_VERTEX', index: 1, to: { x: 20, y: 0 } }).room.vertices[1]).toEqual({ x: 300, y: 0 });
    expect(run(start(), { type: 'MOVE_VERTEX', index: 1, to: { x: 100, y: 500 } }).room.vertices[1]).toEqual({ x: 300, y: 0 });
  });

  it('pulls furniture inside when a wall moves in', () => {
    const s = run(start(), { type: 'MOVE_VERTEX', index: 1, to: { x: 260, y: 0 } });
    expect(s.room.vertices[1]).toEqual({ x: 260, y: 0 });
    expect(inside(s, 'pax')).toBe(true);
  });

  it('adds and removes a corner, keeping the door where it was', () => {
    let s = run(start(), { type: 'ADD_VERTEX', wall: 0 });
    expect(s.room.vertices).toHaveLength(5);
    expect(s.room.openings.find((o) => o.kind === 'door')).toMatchObject({ wall: 3, offset: 20 });
    s = run(s, { type: 'REMOVE_VERTEX', index: 1 });
    expect(s.room.vertices).toEqual(PANEL_BEDROOM.vertices);
    expect(s.room.openings.find((o) => o.kind === 'door')).toMatchObject({ wall: 2, offset: 20 });
    expect(s.room.openings.find((o) => o.kind === 'window')).toMatchObject({ wall: 0, offset: 50 });
  });

  it('L-shaped template keeps the furniture inside or reports what did not fit', () => {
    const s = run(start(), { type: 'APPLY_ROOM_TEMPLATE', template: 'L' });
    expect(s.room.vertices).toHaveLength(6);
    for (const i of s.room.items) if (i.mount.kind === 'floor') expect(inside(s, i.id)).toBe(true);
    const lost = PANEL_BEDROOM.items.filter((i) => !s.room.items.some((j) => j.id === i.id));
    if (lost.length > 0) expect(s.notice).toBe(`Не поместились: ${lost.map((i) => i.name).join(', ')}`);
    else expect(s.notice).toBeNull();
  });

  it('walls mode hides the furniture and lets the outline move freely', () => {
    let s = run(start(), { type: 'BEGIN_WALLS' });
    expect(s.room.items).toHaveLength(0);
    expect(s.walls?.items).toHaveLength(PANEL_BEDROOM.items.length);
    // Pulling the right wall in to 200 cm would not fit the wardrobe in normal mode; here it just moves.
    s = run(s, { type: 'MOVE_VERTEX', index: 1, to: { x: 200, y: 0 } }, { type: 'MOVE_VERTEX', index: 2, to: { x: 200, y: 420 } });
    expect(s.room.vertices[1]).toEqual({ x: 200, y: 0 });
  });

  it('«Готово» brings the furniture back inside the new outline', () => {
    const s = run(start(),
      { type: 'BEGIN_WALLS' },
      { type: 'MOVE_VERTEX', index: 1, to: { x: 260, y: 0 } }, { type: 'MOVE_VERTEX', index: 2, to: { x: 260, y: 420 } },
      { type: 'END_WALLS' });
    expect(s.walls).toBeNull();
    expect(s.room.vertices[1]).toEqual({ x: 260, y: 0 });
    for (const i of s.room.items) if (i.mount.kind === 'floor') expect(inside(s, i.id)).toBe(true);
    const lost = PANEL_BEDROOM.items.filter((i) => !s.room.items.some((j) => j.id === i.id));
    if (lost.length) expect(s.notice).toContain('Не поместились');
    // The wardrobe stood against the right wall: it is still against the (moved) right wall.
    expect(item(s, 'pax')).toMatchObject({ x: 260 - 29, angle: 90 });
  });

  it('«Сбросить форму» returns the outline it started from', () => {
    const s = run(start(), { type: 'BEGIN_WALLS' }, { type: 'APPLY_ROOM_TEMPLATE', template: 'L' }, { type: 'RESET_SHAPE' });
    expect(s.room.vertices).toEqual(PANEL_BEDROOM.vertices);
    expect(s.walls).not.toBeNull();
  });

  it('door can open outwards', () => {
    const s = run(start(), { type: 'SET_DOOR', wall: 2, offset: 20, width: 80, swing: 'out-left' });
    expect(s.room.openings.find((o) => o.kind === 'door')?.swing).toBe('out-left');
  });

  it('a template moves the door to the nearest new wall, not to a wall with the same number', () => {
    const s = run(start(), { type: 'APPLY_ROOM_TEMPLATE', template: 'L' });
    // L: (0,0) (300,0) (300,210) (150,210) (150,420) (0,420) — the door was in the bottom wall, y = 420.
    const door = s.room.openings.find((o) => o.kind === 'door')!;
    expect(door.wall).toBe(4);
  });

  it('loading a preset resets the selection', () => {
    const s = run(start(), { type: 'SELECT_ITEM', id: 'pax' }, { type: 'LOAD_PRESET', room: PANEL_BEDROOM });
    expect(s.selectedId).toBeNull();
  });
});

describe('dragging the door', () => {
  it('snaps to the nearest wall, centred under the pointer, on a 5 cm grid', () => {
    // Pointer near the right wall (x = 300) at y = 152: door 80 wide centred there → offset 110 from (300, 0).
    expect(doorAt(PANEL_BEDROOM.vertices, { x: 290, y: 152 }, 80)).toEqual({ wall: 1, offset: 110 });
    // Near the bottom wall, which runs from (300, 420) to (0, 420).
    expect(doorAt(PANEL_BEDROOM.vertices, { x: 60, y: 430 }, 80)).toEqual({ wall: 2, offset: 200 });
  });

  it('stays inside the wall at its ends', () => {
    expect(doorAt(PANEL_BEDROOM.vertices, { x: 5, y: 2 }, 80)).toEqual({ wall: 0, offset: 0 });
  });
});

describe('placing an item straight onto a spot', () => {
  it('puts the bed where the safe-place suggestion points, with the suggested angle', () => {
    // An empty 4 × 4 m room: the spot is free, so the bed lands exactly there and turns.
    const room = { ...PANEL_BEDROOM, vertices: [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 400 }, { x: 0, y: 400 }],
      openings: [], items: PANEL_BEDROOM.items.filter((i) => i.kind === 'bed') };
    const s = run(initialState(room), { type: 'PLACE_AT', id: 'bed', x: 200, y: 300, angle: 90 });
    expect(item(s, 'bed')).toMatchObject({ x: 200, y: 300, angle: 90 });
    expect(inside(s, 'bed')).toBe(true);
    expect(overlapsAny(s, 'bed')).toBe(false);
  });

  it('carries what stands on the item and refuses a spot that is taken', () => {
    const before = start();
    const taken = item(before, 'pax');
    const s = run(before, { type: 'PLACE_AT', id: 'bed', x: taken.x, y: taken.y, angle: 0 });
    expect(item(s, 'bed')).toMatchObject({ x: item(before, 'bed').x, y: item(before, 'bed').y });
  });
});
