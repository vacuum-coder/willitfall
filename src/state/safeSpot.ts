// Where to move the bed so that nothing falls on it: the closest spot outside every fall zone.
// The zones come from the assessment (src/physics/assess.ts) and already account for the floor, the storey and the record.

import { itemPolygon, polyIntersects, doorZone, type Vec } from '../physics/geometry';
import type { Item, Room } from '../physics/types';
import { contains, GRID_CM, normAngle } from './placement';

export interface BedSpot {
  x: number;
  y: number;
  angle: number;
  /** How far the bed travels, cm — shown to the user. */
  moved: number;
}

/** Axis-aligned box of a polygon, for the cheap check before the exact one. */
const box = (p: Vec[]) => ({
  x0: Math.min(...p.map((v) => v.x)), x1: Math.max(...p.map((v) => v.x)),
  y0: Math.min(...p.map((v) => v.y)), y1: Math.max(...p.map((v) => v.y)),
});
const boxesApart = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) =>
  a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0;

/**
 * The closest place for the bed clear of `zones`, of the other furniture, of the walls and of the doorway.
 * Keeps the current angle if it can, otherwise turns the bed by 90°. Null when the bed is already safe
 * or when nowhere in the room is.
 */
export function safeBedSpot(room: Room, zones: Vec[][], bedId: string): BedSpot | null {
  const bed = room.items.find((i) => i.id === bedId);
  if (!bed) return null;
  const hits = (poly: Vec[], polyBox: ReturnType<typeof box>, targets: { poly: Vec[]; box: ReturnType<typeof box> }[]) =>
    targets.some((t) => !boxesApart(polyBox, t.box) && polyIntersects(poly, t.poly));

  const withBox = (poly: Vec[]) => ({ poly, box: box(poly) });
  const danger = zones.map(withBox);
  const blockers = room.items
    .filter((i) => i.id !== bedId && i.mount.kind === 'floor')
    .map((i) => withBox(itemPolygon(i)))
    .concat(room.openings.filter((o) => o.kind === 'door').map((o) => withBox(doorZone(room.vertices, o))));

  const free = (place: Item) => {
    const poly = itemPolygon(place);
    const b = box(poly);
    return contains(room.vertices, poly) && !hits(poly, b, danger) && !hits(poly, b, blockers);
  };

  if (free(bed)) return null;

  const xs = room.vertices.map((v) => v.x), ys = room.vertices.map((v) => v.y);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  // The current orientation first: turning the bed is a bigger change for the user than sliding it.
  const angles = [bed.angle, normAngle(bed.angle + 90)];
  let best: BedSpot | null = null;
  for (const angle of angles) {
    for (let x = x0; x <= x1; x += GRID_CM) {
      for (let y = y0; y <= y1; y += GRID_CM) {
        const moved = Math.hypot(x - bed.x, y - bed.y);
        if (best && moved >= best.moved) continue;
        if (!free({ ...bed, x, y, angle })) continue;
        best = { x, y, angle, moved: Math.round(moved) };
      }
    }
    if (best) break;
  }
  return best;
}
