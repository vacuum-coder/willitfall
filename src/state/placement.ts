// Placement rules for the plan editor: stay inside the room, never overlap other floor furniture,
// stick to walls, snap to a 5 cm grid, stack small things on tops, hang things on walls.

import polygonClipping, { type Polygon } from 'polygon-clipping';
import { roomWalls, itemPolygon, polyArea, polyIntersects, type Vec, type Wall } from '../physics/geometry';
import type { Item, Room } from '../physics/types';

export const GRID_CM = 5;
/** A dragged item within this distance of a wall turns its back to the wall and sticks to it. */
export const WALL_SNAP_CM = 20;
export const MIN_WALL_CM = 50;

const r6 = (v: number) => Math.round(v * 1e6) / 1e6;
export const grid = (v: number) => Math.round(v / GRID_CM) * GRID_CM;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Angle in degrees normalised to [−180, 180). */
export const normAngle = (a: number) => r6((((a % 360) + 540) % 360) - 180);

const toPoly = (v: Vec[]): Polygon => [v.map((p) => [p.x, p.y] as [number, number])];
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });

/** True when `inner` lies inside `outer` up to 1 cm² (works for any simple polygon, including L and U rooms). */
export function contains(outer: Vec[], inner: Vec[]): boolean {
  const parts = polygonClipping.intersection(toPoly(inner), toPoly(outer));
  const area = parts.reduce((t, pl) => t + polyArea(pl[0].slice(0, -1).map(([x, y]) => ({ x, y }))), 0);
  return area >= polyArea(inner) - 1;
}

export interface WallFrame extends Wall { t: Vec; len: number; angle: number }

export function wallFrames(vertices: Vec[]): WallFrame[] {
  return roomWalls(vertices).map((w) => {
    const len = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y);
    const t = { x: (w.b.x - w.a.x) / len, y: (w.b.y - w.a.y) / len };
    // Item angle whose front (−sin a, cos a) points into the room, i.e. its back is on the wall.
    return { ...w, t, len, angle: normAngle((Math.atan2(-w.inward.x, w.inward.y) * 180) / Math.PI) };
  });
}

/** Centre and angle of an item standing (or hanging) with its back on wall `f`, `offset` cm from the wall start. */
export function againstWall(item: Pick<Item, 'w' | 'd'>, f: WallFrame, offset: number): Pick<Item, 'x' | 'y' | 'angle'> {
  const s = offset + item.w / 2;
  return {
    x: r6(f.a.x + f.t.x * s + f.inward.x * (item.d / 2)),
    y: r6(f.a.y + f.t.y * s + f.inward.y * (item.d / 2)),
    angle: f.angle,
  };
}

/** Offset of an item along wall `f` (its left end), from its centre. */
export const offsetOnWall = (item: Pick<Item, 'x' | 'y' | 'w'>, f: WallFrame) => dot(sub(item, f.a), f.t) - item.w / 2;

/** Index of the wall the item's back stands against (within 5 cm and parallel), or −1. */
export function wallBehind(item: Item, vertices: Vec[]): number {
  const frames = wallFrames(vertices);
  return frames.findIndex((f) => {
    const aligned = Math.abs(normAngle(item.angle - f.angle)) < 0.5;
    const dist = dot(sub(item, f.a), f.inward) - item.d / 2;
    const s = dot(sub(item, f.a), f.t);
    return aligned && Math.abs(dist) <= 5 && s >= 0 && s <= f.len;
  });
}

/** Snap a dragged position to the nearest wall if it is close enough, otherwise to the 5 cm grid. */
export function snap(item: Item, room: Room, to: Vec): Pick<Item, 'x' | 'y' | 'angle'> {
  let best: { slack: number; place: Pick<Item, 'x' | 'y' | 'angle'> } | null = null;
  for (const f of wallFrames(room.vertices)) {
    if (f.len < item.w) continue;
    const slack = Math.abs(dot(sub(to, f.a), f.inward) - item.d / 2);
    const s = dot(sub(to, f.a), f.t);
    if (slack > WALL_SNAP_CM || s < 0 || s > f.len) continue;
    const offset = clamp(grid(s - item.w / 2), 0, f.len - item.w);
    if (!best || slack < best.slack) best = { slack, place: againstWall(item, f, offset) };
  }
  return best?.place ?? { x: grid(to.x), y: grid(to.y), angle: item.angle };
}

const isBlocker = (o: Item, self: Item) => o.id !== self.id && o.mount.kind === 'floor';

/** A floor item is valid inside the room and clear of every other floor item; stacked and wall items only need the room. */
export function isValid(item: Item, room: Room): boolean {
  const poly = itemPolygon(item);
  if (!contains(room.vertices, poly)) return false;
  if (item.mount.kind !== 'floor') return true;
  return !room.items.some((o) => isBlocker(o, item) && polyIntersects(poly, itemPolygon(o)));
}

/** Moves in a straight line towards `to` and stops just before the first wall or piece of furniture. */
export function march(item: Item, room: Room, to: Pick<Item, 'x' | 'y' | 'angle'>): Item {
  const at = (f: number): Item => ({ ...item, x: item.x + (to.x - item.x) * f, y: item.y + (to.y - item.y) * f, angle: to.angle });
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - item.x, to.y - item.y) / 2));
  let lo = 0;
  if (!isValid(at(0), room)) return item;
  for (let i = 1; i <= steps; i++) {
    const hi = i / steps;
    if (isValid(at(hi), room)) { lo = hi; continue; }
    let a = lo, b = hi;
    for (let k = 0; k < 10; k++) { const m = (a + b) / 2; if (isValid(at(m), room)) a = m; else b = m; }
    lo = a;
    break;
  }
  const r = at(lo);
  return { ...r, x: r6(r.x), y: r6(r.y) };
}

/** Closest valid position (5 cm steps, nearest first) keeping the angle, or null when the item cannot fit anywhere. */
export function nearestValid(item: Item, room: Room): Item | null {
  if (isValid(item, room)) return item;
  const xs = room.vertices.map((v) => v.x), ys = room.vertices.map((v) => v.y);
  const R = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  for (let r = GRID_CM; r <= R; r += GRID_CM) {
    const ring: Vec[] = [];
    for (let k = -r; k <= r; k += GRID_CM) ring.push({ x: k, y: -r }, { x: k, y: r }, { x: -r, y: k }, { x: r, y: k });
    ring.sort((p, q) => Math.hypot(p.x, p.y) - Math.hypot(q.x, q.y));
    for (const d of ring) {
      const cand = { ...item, x: r6(item.x + d.x), y: r6(item.y + d.y) };
      if (isValid(cand, room)) return cand;
    }
  }
  return null;
}

/** First free place with the back against a wall, walking each wall in 5 cm steps. */
export function freeWallSpot(item: Item, room: Room): Item | null {
  for (const f of wallFrames(room.vertices)) {
    for (let offset = 0; offset <= f.len - item.w; offset += GRID_CM) {
      const cand = { ...item, ...againstWall(item, f, offset) };
      if (isValid(cand, room)) return cand;
    }
  }
  return null;
}

/** Ids of everything standing on `id`, directly or on top of something that stands on it. */
export function descendants(room: Room, id: string): string[] {
  const direct = room.items.filter((i) => i.mount.kind === 'onItem' && i.mount.supportId === id).map((i) => i.id);
  return direct.flatMap((d) => [d, ...descendants(room, d)]);
}

/** The piece of furniture whose top can take `item` at its current position: centre on the top and footprint within it. */
export function supportUnder(item: Item, room: Room): Item | null {
  const excluded = new Set([item.id, ...descendants(room, item.id)]);
  const poly = itemPolygon(item);
  const tops = room.items.filter((o) => !excluded.has(o.id) && o.kind !== 'bed' && o.mount.kind !== 'wall')
    .filter((o) => contains(itemPolygon(o), poly));
  return tops.sort((a, b) => b.height - a.height)[0] ?? null;
}

const cross = (o: Vec, a: Vec, b: Vec) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
function segmentsTouch(p1: Vec, p2: Vec, q1: Vec, q2: Vec): boolean {
  const d1 = cross(q1, q2, p1), d2 = cross(q1, q2, p2), d3 = cross(p1, p2, q1), d4 = cross(p1, p2, q2);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  const on = (a: Vec, b: Vec, c: Vec) =>
    Math.min(a.x, b.x) <= c.x && c.x <= Math.max(a.x, b.x) && Math.min(a.y, b.y) <= c.y && c.y <= Math.max(a.y, b.y);
  return (d1 === 0 && on(q1, q2, p1)) || (d2 === 0 && on(q1, q2, p2)) || (d3 === 0 && on(p1, p2, q1)) || (d4 === 0 && on(p1, p2, q2));
}

/** Which template the outline is: every wall horizontal or vertical and 4 / 6 / 8 corners. */
export function shapeKind(v: Vec[]): 'rect' | 'L' | 'U' | 'custom' {
  const n = v.length;
  const square = v.every((a, i) => { const b = v[(i + 1) % n]; return Math.abs(a.x - b.x) < 1e-6 || Math.abs(a.y - b.y) < 1e-6; });
  if (!square) return 'custom';
  return n === 4 ? 'rect' : n === 6 ? 'L' : n === 8 ? 'U' : 'custom';
}

/** At least 3 corners, every wall ≥ 50 cm, no wall crossing another. */
export function isValidRoom(v: Vec[]): boolean {
  const n = v.length;
  if (n < 3 || polyArea(v) < 1) return false;
  for (let i = 0; i < n; i++) if (Math.hypot(v[(i + 1) % n].x - v[i].x, v[(i + 1) % n].y - v[i].y) < MIN_WALL_CM) return false;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (j === i + 1 || (i === 0 && j === n - 1)) continue; // neighbours share a corner
    if (segmentsTouch(v[i], v[(i + 1) % n], v[j], v[(j + 1) % n])) return false;
  }
  return true;
}

/** Where a door of `width` goes when dragged to `p`: the nearest wall long enough, centred on the pointer, 5 cm grid. */
export function doorAt(vertices: Vec[], p: Vec, width: number): { wall: number; offset: number } | null {
  let best: { wall: number; offset: number; dist: number } | null = null;
  const frames = wallFrames(vertices);
  for (let wall = 0; wall < frames.length; wall++) {
    const f = frames[wall];
    if (f.len < width) continue;
    const s = dot(sub(p, f.a), f.t);
    const along = clamp(s, 0, f.len);
    const dist = Math.hypot(f.a.x + f.t.x * along - p.x, f.a.y + f.t.y * along - p.y);
    if (!best || dist < best.dist) best = { wall, offset: clamp(grid(s - width / 2), 0, f.len - width), dist };
  }
  return best && { wall: best.wall, offset: best.offset };
}
