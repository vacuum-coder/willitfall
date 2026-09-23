// All edits of the room go through this reducer (spec, «Действия редьюсера»). Pure and deterministic.

import type { Fastening, FurnitureKind, Item, Opening, Room, Settings, BuildingType } from '../physics/types';
import type { Filling } from '../physics/tipping';
import type { Side, Vec } from '../physics/geometry';
import { product, KIND_LABEL } from '../data/furniture';
import { DEFAULT_SETTINGS } from '../data/presets';
import {
  clamp, normAngle, snap, isValid, march, nearestValid, freeWallSpot, descendants, supportUnder,
  isValidRoom, wallFrames, againstWall, offsetOnWall, wallBehind, grid, type WallFrame,
} from './placement';

export interface AppState {
  room: Room;
  settings: Settings;
  selectedId: string | null;
  /** One-line message for the user after an edit that could not be done fully. */
  notice: string | null;
  nextId: number;
  /** Walls mode: the furniture is put aside while the outline is edited, with the outline it started from. */
  walls: { items: Item[]; vertices: Vec[]; openings: Opening[] } | null;
}

export type RoomTemplate = 'rect' | 'L' | 'U';
export interface CustomItem { kind: FurnitureKind; name: string; w: number; d: number; height: number; productKey?: string }

export type Action =
  | { type: 'LOAD_PRESET'; room: Room }
  | { type: 'APPLY_ROOM_TEMPLATE'; template: RoomTemplate }
  | { type: 'MOVE_VERTEX'; index: number; to: Vec }
  | { type: 'ADD_VERTEX'; wall: number }
  | { type: 'REMOVE_VERTEX'; index: number }
  | { type: 'SET_DOOR'; wall: number; offset: number; width: number; swing?: Opening['swing'] }
  | { type: 'SET_FLOOR'; floor: number; totalFloors: number }
  | { type: 'SET_INTENSITY'; value: number }
  | { type: 'SET_BUILDING_TYPE'; value: BuildingType }
  | { type: 'SET_RECORD'; id: string }
  | { type: 'ADD_ITEM'; productKey: string }
  | { type: 'ADD_ITEM'; custom: CustomItem }
  | { type: 'MOVE_ITEM'; id: string; x: number; y: number }
  | { type: 'PLACE_AT'; id: string; x: number; y: number; angle: number }
  | { type: 'SET_ANGLE'; id: string; angle: number }
  | { type: 'RESIZE_ITEM'; id: string; w?: number; d?: number; height?: number }
  | { type: 'PLACE_ON'; id: string; supportId: string | null }
  | { type: 'MOUNT_ON_WALL'; id: string; wall: number; offset: number; mountHeight: number; fastening: Fastening }
  | { type: 'SET_FASTENING'; id: string; fastening: Fastening }
  | { type: 'SET_FILLING'; id: string; filling: Filling }
  | { type: 'SET_BED_HEAD'; id: string; side: Side }
  | { type: 'TOGGLE_ANCHOR'; id: string }
  | { type: 'DELETE_ITEM'; id: string }
  | { type: 'SELECT_ITEM'; id: string | null }
  | { type: 'CLEAR_NOTICE' }
  | { type: 'BEGIN_WALLS' }
  | { type: 'END_WALLS' }
  | { type: 'RESET_SHAPE' };

export const MIN_SIZE_CM = 10;
export const MAX_HEIGHT_CM = 300;
export const MAX_FLOORS = 40;
/** Kinds that are hung on a wall when added. */
export const WALL_KINDS: FurnitureKind[] = ['wallShelf', 'picture'];
/** Starting mounting height of a newly hung item — the user sets the real one in the card. */
export const DEFAULT_MOUNT_HEIGHT_CM = 150;

export const initialState = (room: Room, settings: Settings = DEFAULT_SETTINGS): AppState =>
  ({ room: clone(room), settings, selectedId: null, notice: null, nextId: 1, walls: null });

/** Deep copy of plain room data; structuredClone is missing before iOS 15.4. */
const clone = <T,>(v: T): T => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

const round1 = (v: number) => Math.round(v * 10) / 10;
const withItems = (s: AppState, items: Item[]): AppState => ({ ...s, room: { ...s.room, items } });
const replace = (s: AppState, next: Item) => withItems(s, s.room.items.map((i) => (i.id === next.id ? next : i)));
const byId = (s: AppState, id: string) => s.room.items.find((i) => i.id === id);

/** Moves and turns everything stacked on `before` so it keeps its place on the top of `after`. */
function carryDependants(s: AppState, before: Item, after: Item): AppState {
  const ids = new Set(descendants(s.room, before.id));
  if (!ids.size) return s;
  const da = after.angle - before.angle, r = (da * Math.PI) / 180;
  return withItems(s, s.room.items.map((i) => {
    if (!ids.has(i.id)) return i;
    const dx = i.x - before.x, dy = i.y - before.y;
    return {
      ...i,
      x: after.x + dx * Math.cos(r) - dy * Math.sin(r),
      y: after.y + dx * Math.sin(r) + dy * Math.cos(r),
      angle: normAngle(i.angle + da),
    };
  }));
}

/** Everything stacked on `id` comes down to the floor where it stands. */
const dropDependants = (s: AppState, id: string): AppState => withItems(s, s.room.items.map((i) =>
  i.mount.kind === 'onItem' && i.mount.supportId === id ? { ...i, mount: { kind: 'floor' as const } } : i));

/** Position of a wall-mounted item from its mount. */
function hang(item: Item, frames: WallFrame[]): Item {
  if (item.mount.kind !== 'wall') return item;
  const f = frames[item.mount.wall];
  const offset = clamp(item.mount.offset, 0, Math.max(0, f.len - item.w));
  return { ...item, ...againstWall(item, f, offset), mount: { ...item.mount, offset } };
}

function moveItem(s: AppState, item: Item, to: Vec): AppState {
  if (item.mount.kind === 'wall') {
    const frames = wallFrames(s.room.vertices);
    const dist = (f: WallFrame) => {
      const t = clamp((to.x - f.a.x) * f.t.x + (to.y - f.a.y) * f.t.y, 0, f.len);
      return Math.hypot(f.a.x + f.t.x * t - to.x, f.a.y + f.t.y * t - to.y);
    };
    const wall = frames.map((f, i) => ({ f, i })).filter(({ f }) => f.len >= item.w).sort((a, b) => dist(a.f) - dist(b.f))[0];
    if (!wall) return s;
    const offset = clamp(grid(offsetOnWall({ ...to, w: item.w }, wall.f)), 0, wall.f.len - item.w);
    return replace(s, hang({ ...item, mount: { ...item.mount, wall: wall.i, offset } }, frames));
  }

  // Dropped onto a top → it stands there.
  const stacked = { ...item, x: to.x, y: to.y };
  const support = supportUnder(stacked, s.room);
  if (support && isValid({ ...stacked, mount: { kind: 'onItem', supportId: support.id } }, s.room)) {
    const next: Item = { ...stacked, mount: { kind: 'onItem', supportId: support.id } };
    return carryDependants(replace(s, next), item, next);
  }

  const onFloor: Item = { ...item, mount: { kind: 'floor' } };
  const target = snap(onFloor, s.room, to);
  let next: Item | null = { ...onFloor, ...target };
  if (!isValid(next, s.room)) {
    next = item.mount.kind === 'floor'
      ? march(item, s.room, { x: target.x, y: target.y, angle: item.angle })
      : nearestValid({ ...onFloor, x: target.x, y: target.y }, s.room);
  }
  if (!next) return s;
  return carryDependants(replace(s, next), item, next);
}

/** Re-applies a changed size or angle; items with their back on a wall stay on it. */
function refit(s: AppState, before: Item, changed: Item, keepPosition: boolean): AppState {
  let next: Item | null = changed;
  if (next.mount.kind === 'wall') return replace(s, hang(next, wallFrames(s.room.vertices)));
  const wall = wallBehind(before, s.room.vertices);
  if (!keepPosition && wall >= 0 && next.mount.kind === 'floor') {
    const f = wallFrames(s.room.vertices)[wall];
    next = { ...next, ...againstWall(next, f, clamp(offsetOnWall(before, f), 0, Math.max(0, f.len - next.w))) };
  }
  if (!isValid(next, s.room)) next = keepPosition ? null : nearestValid(next, s.room);
  if (!next) return s;
  return carryDependants(replace(s, next), before, next);
}

/**
 * Applies a new room outline. Openings and wall items keep their absolute place on the wall they map to;
 * floor items standing against a wall stay against it; everything is pulled inside. `strict` refuses the
 * change when some furniture cannot fit (dragging a corner); otherwise what does not fit is removed and reported.
 */
function reshape(s: AppState, vertices: Vec[], mapWall: (old: number) => number[], strict: boolean): AppState {
  if (!isValidRoom(vertices)) return s;
  const oldF = wallFrames(s.room.vertices), newF = wallFrames(vertices);

  const onWall = (wall: number, offset: number, width: number): { wall: number; offset: number } | null => {
    const p = { x: oldF[wall].a.x + oldF[wall].t.x * offset, y: oldF[wall].a.y + oldF[wall].t.y * offset };
    const q = { x: p.x + oldF[wall].t.x * width, y: p.y + oldF[wall].t.y * width };
    let best: { wall: number; offset: number; overlap: number; dist: number } | null = null;
    for (const nw of mapWall(wall)) {
      const f = newF[nw];
      if (!f || f.len < width) continue;
      const raw = (p.x - f.a.x) * f.t.x + (p.y - f.a.y) * f.t.y;
      const off = clamp(raw, 0, f.len - width);
      const overlap = Math.min(raw + width, f.len) - Math.max(raw, 0);
      // Several candidates when the outline changed completely: prefer the wall on the same line (parallel and
      // close to it), then the nearest segment, then the best overlap.
      const o = oldF[wall].t, onLine = (r: Vec) => Math.abs((r.x - f.a.x) * f.inward.x + (r.y - f.a.y) * f.inward.y);
      const dist = Math.max(onLine(p), onLine(q)) + 1000 * (1 - Math.abs(o.x * f.t.x + o.y * f.t.y))
        + 1e-3 * Math.max(distToWall(p, f), distToWall(q, f));
      if (!best || dist < best.dist - 1e-6 || (Math.abs(dist - best.dist) <= 1e-6 && overlap > best.overlap)) {
        best = { wall: nw, offset: Math.round(off * 1e6) / 1e6, overlap, dist };
      }
    }
    return best && { wall: best.wall, offset: best.offset };
  };

  const openings = s.room.openings.flatMap((o) => {
    const m = onWall(o.wall, o.offset, o.width);
    return m ? [{ ...o, ...m }] : [];
  });

  const room: Room = { ...s.room, vertices, openings, items: [] };
  const lost: Item[] = [];
  const placed: Item[] = [];
  const pending = [...s.room.items];
  // Floor items first (they define free space), then stacked items follow their supports, then wall items.
  const order = (i: Item) => (i.mount.kind === 'floor' ? 0 : i.mount.kind === 'onItem' ? 1 : 2);
  pending.sort((a, b) => order(a) - order(b));
  const moved = new Map<string, { before: Item; after: Item }>();
  for (const item of pending) {
    room.items = [...placed, item];
    let next: Item | null = item;
    if (item.mount.kind === 'wall') {
      const m = onWall(item.mount.wall, item.mount.offset, item.w);
      next = m ? hang({ ...item, mount: { ...item.mount, ...m } }, newF) : null;
    } else if (item.mount.kind === 'onItem') {
      const sup = moved.get(item.mount.supportId);
      if (!sup) next = null;
      else {
        const da = ((sup.after.angle - sup.before.angle) * Math.PI) / 180, dx = item.x - sup.before.x, dy = item.y - sup.before.y;
        next = {
          ...item,
          x: sup.after.x + dx * Math.cos(da) - dy * Math.sin(da),
          y: sup.after.y + dx * Math.sin(da) + dy * Math.cos(da),
          angle: normAngle(item.angle + sup.after.angle - sup.before.angle),
        };
      }
    } else {
      const wall = wallBehind(item, s.room.vertices);
      if (wall >= 0) {
        const m = onWall(wall, offsetOnWall(item, oldF[wall]), item.w);
        if (m) next = { ...item, ...againstWall(item, newF[m.wall], m.offset) };
      }
      room.items = [...placed, next!];
      next = nearestValid(next!, room);
    }
    if (!next) { lost.push(item); continue; }
    placed.push(next);
    moved.set(item.id, { before: item, after: next });
  }
  if (lost.length && strict) return s;
  room.items = s.room.items.flatMap((i) => placed.filter((p) => p.id === i.id));
  const selectedId = s.selectedId && room.items.some((i) => i.id === s.selectedId) ? s.selectedId : null;
  return { ...s, room, selectedId, notice: lost.length ? `Не поместились: ${lost.map((i) => i.name).join(', ')}` : null };
}

function distToWall(p: Vec, f: WallFrame): number {
  const t = clamp((p.x - f.a.x) * f.t.x + (p.y - f.a.y) * f.t.y, 0, f.len);
  return Math.hypot(f.a.x + f.t.x * t - p.x, f.a.y + f.t.y * t - p.y);
}

function template(kind: RoomTemplate, v: Vec[]): Vec[] {
  const xs = v.map((p) => p.x), ys = v.map((p) => p.y);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), W = Math.max(...xs) - x0, H = Math.max(...ys) - y0;
  const P = (fx: number, fy: number): Vec => ({ x: x0 + grid(W * fx), y: y0 + grid(H * fy) });
  if (kind === 'rect') return [P(0, 0), P(1, 0), P(1, 1), P(0, 1)];
  if (kind === 'L') return [P(0, 0), P(1, 0), P(1, 0.5), P(0.5, 0.5), P(0.5, 1), P(0, 1)];
  return [P(0, 0), P(1, 0), P(1, 1), P(2 / 3, 1), P(2 / 3, 0.5), P(1 / 3, 0.5), P(1 / 3, 1), P(0, 1)];
}

function addItem(s: AppState, spec: CustomItem): AppState {
  const size = (v: number) => clamp(Math.round(v), MIN_SIZE_CM, 1000);
  const base: Item = {
    id: `item-${s.nextId}`, kind: spec.kind, name: spec.name,
    w: size(spec.w), d: size(spec.d), height: clamp(Math.round(spec.height), MIN_SIZE_CM, MAX_HEIGHT_CM),
    x: 0, y: 0, angle: 0, mount: { kind: 'floor' }, anchored: false, filling: 'even',
    ...(spec.productKey ? { productKey: spec.productKey } : {}),
  };
  let placed: Item | null;
  if (WALL_KINDS.includes(spec.kind)) {
    const frames = wallFrames(s.room.vertices);
    const taken = s.room.items.flatMap((i) => (i.mount.kind === 'wall' ? [{ wall: i.mount.wall, from: i.mount.offset, to: i.mount.offset + i.w }] : []));
    const free = (wall: number, offset: number) =>
      !taken.some((t) => t.wall === wall && offset < t.to && t.from < offset + base.w);
    placed = null;
    search: for (let wall = 0; wall < frames.length; wall++) {
      for (let offset = 0; offset <= frames[wall].len - base.w; offset += 5) {
        if (!free(wall, offset)) continue;
        placed = hang({ ...base, mount: { kind: 'wall', wall, offset, mountHeight: DEFAULT_MOUNT_HEIGHT_CM, fastening: 'unknown' } }, frames);
        break search;
      }
    }
  } else {
    placed = freeWallSpot(base, s.room);
  }
  if (!placed) return { ...s, notice: `Нет свободного места для «${spec.name}»` };
  return { ...withItems(s, [...s.room.items, placed]), selectedId: placed.id, nextId: s.nextId + 1, notice: null };
}

export function roomReducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'LOAD_PRESET':
      return { ...s, room: clone(a.room), selectedId: null, notice: null };
    case 'CLEAR_NOTICE':
      return { ...s, notice: null };
    case 'BEGIN_WALLS':
      if (s.walls) return s;
      return {
        ...s, selectedId: null, notice: null,
        walls: { items: s.room.items, vertices: s.room.vertices, openings: s.room.openings },
        room: { ...s.room, items: [] },
      };
    case 'RESET_SHAPE':
      return s.walls ? { ...s, room: { ...s.room, vertices: s.walls.vertices, openings: s.walls.openings } } : s;
    case 'END_WALLS': {
      if (!s.walls) return s;
      // Put the furniture back as if the outline had changed from the old one to the new one in a single step.
      const before: AppState = { ...s, walls: null, room: { ...s.room, vertices: s.walls.vertices, openings: [], items: s.walls.items } };
      const all = s.room.vertices.map((_, i) => i);
      const back = reshape(before, s.room.vertices, () => all, false);
      return { ...back, walls: null, room: { ...back.room, openings: s.room.openings } };
    }
    case 'SELECT_ITEM':
      return { ...s, selectedId: a.id };
    case 'SET_INTENSITY':
      return { ...s, settings: { ...s.settings, intensity: clamp(round1(a.value), 5, 10) } };
    case 'SET_FLOOR': {
      const totalFloors = clamp(Math.round(a.totalFloors), 1, MAX_FLOORS);
      return { ...s, settings: { ...s.settings, totalFloors, floor: clamp(Math.round(a.floor), 1, totalFloors) } };
    }
    case 'SET_BUILDING_TYPE':
      return { ...s, settings: { ...s.settings, buildingType: a.value } };
    case 'SET_RECORD':
      return { ...s, settings: { ...s.settings, recordId: a.id } };
    case 'ADD_ITEM':
      if ('productKey' in a) {
        const p = product(a.productKey);
        return addItem(s, { kind: p.kind, name: KIND_LABEL[p.kind], w: p.w, d: p.d, height: p.height, productKey: p.key });
      }
      return addItem(s, a.custom);
    case 'SET_DOOR': {
      const frames = wallFrames(s.room.vertices);
      const wall = clamp(Math.round(a.wall), 0, frames.length - 1), f = frames[wall];
      const width = clamp(a.width, 50, f.len);
      const door: Opening = {
        kind: 'door', wall, width, offset: clamp(a.offset, 0, f.len - width),
        swing: a.swing ?? s.room.openings.find((o) => o.kind === 'door')?.swing,
      };
      const rest = s.room.openings.filter((o) => o.kind !== 'door');
      return { ...s, room: { ...s.room, openings: [...rest, door] } };
    }
    case 'MOVE_VERTEX': {
      const v = s.room.vertices.map((p, i) => (i === a.index ? { x: a.to.x, y: a.to.y } : p));
      return reshape(s, v, (w) => [w], true);
    }
    case 'ADD_VERTEX': {
      const n = s.room.vertices.length, k = a.wall;
      const p = s.room.vertices[k], q = s.room.vertices[(k + 1) % n];
      const v = [...s.room.vertices.slice(0, k + 1), { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, ...s.room.vertices.slice(k + 1)];
      return reshape(s, v, (w) => (w < k ? [w] : w === k ? [k, k + 1] : [w + 1]), true);
    }
    case 'REMOVE_VERTEX': {
      const n = s.room.vertices.length, k = a.index;
      if (n <= 3) return s;
      const v = s.room.vertices.filter((_, i) => i !== k);
      const prev = (k - 1 + n) % n, merged = (k - 1 + (n - 1)) % (n - 1);
      return reshape(s, v, (w) => (w === prev || w === k ? [merged] : [w > k ? w - 1 : w]), true);
    }
    case 'APPLY_ROOM_TEMPLATE': {
      const v = template(a.template, s.room.vertices);
      // A new shape has new walls: doors, windows and wall items move to the nearest one.
      const all = v.map((_, i) => i);
      return reshape(s, v, () => all, false);
    }
  }

  const item = byId(s, a.id);
  if (!item) return s;
  switch (a.type) {
    case 'MOVE_ITEM':
      return moveItem(s, item, { x: a.x, y: a.y });
    // Straight onto a spot the app worked out itself (the safe place for the bed): no sliding, no wall snapping.
    case 'PLACE_AT':
      return refit(s, item, { ...item, x: a.x, y: a.y, angle: normAngle(a.angle) }, true);
    case 'SET_ANGLE':
      if (item.mount.kind === 'wall') return s;
      return refit(s, item, { ...item, angle: normAngle(a.angle) }, true);
    case 'RESIZE_ITEM': {
      const size = (v: number | undefined, cur: number) => (v === undefined ? cur : clamp(Math.round(v), MIN_SIZE_CM, 1000));
      const height = a.height === undefined ? item.height : clamp(Math.round(a.height), MIN_SIZE_CM, MAX_HEIGHT_CM);
      return refit(s, item, { ...item, w: size(a.w, item.w), d: size(a.d, item.d), height }, false);
    }
    case 'PLACE_ON': {
      if (a.supportId === null) {
        if (item.mount.kind !== 'onItem') return s;
        const down = nearestValid({ ...item, mount: { kind: 'floor' } }, s.room);
        return down ? replace(s, down) : { ...s, notice: `Рядом нет места, чтобы поставить «${item.name}» на пол` };
      }
      const sup = supportUnder(item, s.room);
      if (!sup || sup.id !== a.supportId) return s;
      return replace(s, { ...item, mount: { kind: 'onItem', supportId: sup.id } });
    }
    case 'MOUNT_ON_WALL': {
      const frames = wallFrames(s.room.vertices);
      const wall = clamp(Math.round(a.wall), 0, frames.length - 1);
      const mountHeight = clamp(a.mountHeight, 0, MAX_HEIGHT_CM - item.height);
      const next = hang({ ...item, anchored: false, mount: { kind: 'wall', wall, offset: a.offset, mountHeight, fastening: a.fastening } }, frames);
      return replace(dropDependants(s, item.id), next);
    }
    case 'SET_FASTENING':
      return item.mount.kind === 'wall' ? replace(s, { ...item, mount: { ...item.mount, fastening: a.fastening } }) : s;
    case 'SET_FILLING':
      return replace(s, { ...item, filling: a.filling });
    case 'SET_BED_HEAD':
      return item.kind === 'bed' ? replace(s, { ...item, headSide: a.side }) : s;
    case 'TOGGLE_ANCHOR':
      return replace(s, { ...item, anchored: !item.anchored });
    case 'DELETE_ITEM': {
      const t = dropDependants(s, item.id);
      return { ...withItems(t, t.room.items.filter((i) => i.id !== item.id)), selectedId: s.selectedId === item.id ? null : s.selectedId };
    }
  }
}
