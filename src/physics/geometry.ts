// Plan geometry in centimetres. The formulas only assume a right-handed pair of axes, so they hold
// both for x right / y up with counter-clockwise angles and for the app's SVG plan
// (x right, y down, angles clockwise on screen).
// An item's local frame: u = (cos a, sin a) runs along its width, n = (−sin a, cos a) points
// out of its front. The back is where furniture normally stands against a wall.

import polygonClipping, { type Polygon, type Ring } from 'polygon-clipping';

export interface Vec { x: number; y: number }
/** A rectangle on the plan: centre, width (along u), depth (along n), rotation. */
export interface Placed { x: number; y: number; w: number; d: number; angle: number }
export type Side = 'front' | 'back' | 'left' | 'right';
export interface Wall { a: Vec; b: Vec; inward: Vec }
/** An opening on wall number `wall` (edge room[wall] → room[wall+1]), `offset` cm from its start. */
export interface WallSpan { wall: number; offset: number; width: number }

/** Depth of the pillow strip at the head side of a bed. */
export const PILLOW_DEPTH_CM = 60;
/** Clear passage in front of a door, measured into the room. */
export const DOOR_CLEARANCE_CM = 90;

const axes = (p: Placed) => {
  const r = (p.angle * Math.PI) / 180;
  return { u: { x: Math.cos(r), y: Math.sin(r) }, n: { x: -Math.sin(r), y: Math.cos(r) } };
};

/** Rectangle in the item's local frame, u ∈ [u0, u1], n ∈ [n0, n1]. */
function localRect(p: Placed, u0: number, u1: number, n0: number, n1: number): Vec[] {
  const { u, n } = axes(p);
  const at = (s: number, t: number): Vec => ({ x: p.x + u.x * s + n.x * t, y: p.y + u.y * s + n.y * t });
  return [at(u0, n0), at(u1, n0), at(u1, n1), at(u0, n1)];
}

export const itemPolygon = (p: Placed): Vec[] => localRect(p, -p.w / 2, p.w / 2, -p.d / 2, p.d / 2);

/** Signed shoelace area: positive for counter-clockwise vertices. */
const signedArea = (p: Vec[]): number =>
  p.reduce((s, v, i) => { const w = p[(i + 1) % p.length]; return s + v.x * w.y - w.x * v.y; }, 0) / 2;

export const polyArea = (p: Vec[]): number => Math.abs(signedArea(p));

export function roomWalls(vertices: Vec[]): Wall[] {
  const ccw = signedArea(vertices) > 0;
  return vertices.map((a, i) => {
    const b = vertices[(i + 1) % vertices.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const t = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    // For a counter-clockwise polygon the interior lies to the left of each edge.
    return { a, b, inward: ccw ? { x: -t.y, y: t.x } : { x: t.y, y: -t.x } };
  });
}

/** End points of one side of an item. */
function sideSegment(p: Placed, side: Side): [Vec, Vec] {
  const [c0, c1, c2, c3] = itemPolygon(p); // (−u,−n) (+u,−n) (+u,+n) (−u,+n)
  switch (side) {
    case 'back': return [c0, c1];
    case 'right': return [c1, c2];
    case 'front': return [c2, c3];
    case 'left': return [c3, c0];
  }
}

function distToSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** True when the whole side lies within tolCm of one wall. */
export function sideTouchesWall(p: Placed, side: Side, walls: Wall[], tolCm = 5): boolean {
  const [s0, s1] = sideSegment(p, side);
  return walls.some((w) => distToSegment(s0, w.a, w.b) <= tolCm && distToSegment(s1, w.a, w.b) <= tolCm);
}

const toRing = (p: Vec[]): Ring => p.map((v) => [v.x, v.y] as [number, number]);
const fromRing = (r: Ring): Vec[] => r.slice(0, -1).map(([x, y]) => ({ x, y })); // output rings are closed

function contains(poly: Vec[], q: Vec): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Rectangle beyond one side of the item, from `start` to `start + length` outwards from that side. */
function beyondSide(p: Placed, side: Side, start: number, length: number): Vec[] {
  const { w, d } = p, e = start + length;
  switch (side) {
    case 'front': return localRect(p, -w / 2, w / 2, d / 2 + start, d / 2 + e);
    case 'back': return localRect(p, -w / 2, w / 2, -d / 2 - e, -d / 2 - start);
    case 'right': return localRect(p, w / 2 + start, w / 2 + e, -d / 2, d / 2);
    case 'left': return localRect(p, -w / 2 - e, -w / 2 - start, -d / 2, d / 2);
  }
}

/**
 * Area the item sweeps when it falls over `side`: the side's length times the fall length (its height),
 * clipped by the room. hitsWall = a wall cuts the zone, so the item leans on it instead of lying flat.
 * A negative `start` begins the zone inside the item (used for wall-mounted items, which drop from under themselves).
 */
export function zonePolygon(
  p: Placed, side: Side, length: number, room: Vec[], start = 0,
): { poly: Vec[]; hitsWall: boolean } {
  const raw = beyondSide(p, side, start, length);
  const pieces = polygonClipping.intersection([toRing(raw)] as Polygon, [toRing(room)] as Polygon).map((pl) => fromRing(pl[0]));
  if (pieces.length === 0) return { poly: [], hitsWall: true };
  // A reflex corner can split the zone; keep the piece that starts at the item's side.
  const [s0, s1] = sideSegment(p, side);
  const { u, n } = axes(p);
  const out = side === 'front' ? n : side === 'back' ? { x: -n.x, y: -n.y } : side === 'right' ? u : { x: -u.x, y: -u.y };
  const probe = { x: (s0.x + s1.x) / 2 + out.x * 0.5, y: (s0.y + s1.y) / 2 + out.y * 0.5 };
  const poly = pieces.find((pc) => contains(pc, probe)) ?? pieces.reduce((a, b) => (polyArea(b) > polyArea(a) ? b : a));
  return { poly, hitsWall: polyArea(poly) < polyArea(raw) * (1 - 1e-6) };
}

/** Polygons overlap by more than minAreaCm2 (touching edges do not count). */
export function polyIntersects(a: Vec[], b: Vec[], minAreaCm2 = 1): boolean {
  if (a.length < 3 || b.length < 3) return false;
  const inter = polygonClipping.intersection([toRing(a)] as Polygon, [toRing(b)] as Polygon);
  return inter.reduce((s, pl) => s + polyArea(fromRing(pl[0])), 0) > minAreaCm2;
}

/** Where the head lies: a PILLOW_DEPTH_CM strip inside the bed along its head side. */
export const pillowZone = (bed: Placed, headSide: Side = 'back'): Vec[] =>
  beyondSide(bed, headSide, -PILLOW_DEPTH_CM, PILLOW_DEPTH_CM);

/** Passage to the door: door width × DOOR_CLEARANCE_CM inside the room in front of the opening. */
export function doorZone(room: Vec[], o: WallSpan): Vec[] {
  const wall = roomWalls(room)[o.wall];
  const len = Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y);
  const t = { x: (wall.b.x - wall.a.x) / len, y: (wall.b.y - wall.a.y) / len };
  const p0 = { x: wall.a.x + t.x * o.offset, y: wall.a.y + t.y * o.offset };
  const p1 = { x: p0.x + t.x * o.width, y: p0.y + t.y * o.width };
  const k = DOOR_CLEARANCE_CM;
  return [p0, p1, { x: p1.x + wall.inward.x * k, y: p1.y + wall.inward.y * k }, { x: p0.x + wall.inward.x * k, y: p0.y + wall.inward.y * k }];
}
