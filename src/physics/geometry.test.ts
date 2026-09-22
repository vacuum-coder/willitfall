import { describe, it, expect } from 'vitest';
import {
  itemPolygon, roomWalls, sideTouchesWall, zonePolygon, polyArea, polyIntersects, pillowZone, doorZone,
  type Vec, type Placed,
} from './geometry';

// 300 × 420 cm room, x to the right, y up.
const room: Vec[] = [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 420 }, { x: 0, y: 420 }];
const walls = roomWalls(room);
// PAX 100 wide, 58 deep, back against the right wall, front facing −x (angle 90°: depth axis → −x).
const pax: Placed = { x: 300 - 29, y: 200, w: 100, d: 58, angle: 90 };
const square = (x: number, y: number, s: number): Vec[] =>
  [{ x, y }, { x: x + s, y }, { x: x + s, y: y + s }, { x, y: y + s }];

describe('geometry', () => {
  it('builds the footprint of a rotated item', () => {
    expect(polyArea(itemPolygon(pax))).toBeCloseTo(100 * 58, 6);
    expect(polyArea(itemPolygon({ ...pax, angle: 30 }))).toBeCloseTo(100 * 58, 6);
    const xs = itemPolygon(pax).map((p) => p.x);
    expect(Math.max(...xs)).toBeCloseTo(300, 9);
    expect(Math.min(...xs)).toBeCloseTo(242, 9);
  });

  it('finds inward normals whatever the vertex order', () => {
    for (const r of [room, [...room].reverse()]) {
      const right = roomWalls(r).find((w) => w.a.x === 300 && w.b.x === 300)!;
      expect(right.inward.x).toBeCloseTo(-1, 12);
      expect(right.inward.y).toBeCloseTo(0, 12);
    }
  });

  it('detects the side standing against a wall', () => {
    expect(sideTouchesWall(pax, 'back', walls)).toBe(true);
    expect(sideTouchesWall(pax, 'front', walls)).toBe(false);
    expect(sideTouchesWall({ ...pax, x: 300 - 29 - 20 }, 'back', walls)).toBe(false);
  });

  it('falling zone in front of the wardrobe: height × width, free of walls', () => {
    const z = zonePolygon(pax, 'front', 236, room);
    expect(polyArea(z.poly)).toBeCloseTo(236 * 100, 3);
    expect(z.hitsWall).toBe(false);
  });

  it('rotation keeps the zone area', () => {
    const z = zonePolygon({ x: 150, y: 210, w: 100, d: 58, angle: 30 }, 'front', 100, room);
    expect(polyArea(z.poly)).toBeCloseTo(100 * 100, 3);
    expect(z.hitsWall).toBe(false);
  });

  it('a wall 50 cm away cuts the zone and stops the fall', () => {
    const z = zonePolygon({ ...pax, x: 50 + 29 }, 'front', 236, room); // front faces −x, left wall 50 cm away
    expect(polyArea(z.poly)).toBeCloseTo(50 * 100, 3);
    expect(z.hitsWall).toBe(true);
  });

  it('overlap needs real area, touching edges do not count', () => {
    expect(polyIntersects(square(0, 0, 100), square(90, 90, 100))).toBe(true);
    expect(polyIntersects(square(0, 0, 100), square(100, 0, 100))).toBe(false);
  });

  it('pillow zone is a 60 cm strip at the head side of the bed', () => {
    const bed: Placed = { x: 80, y: 100, w: 160, d: 200, angle: 0 }; // back edge at y = 0
    const back = pillowZone(bed, 'back');
    expect(polyArea(back)).toBeCloseTo(160 * 60, 6);
    expect(Math.min(...back.map((v) => v.y))).toBeCloseTo(0, 9);
    expect(Math.max(...back.map((v) => v.y))).toBeCloseTo(60, 9);
    const left = pillowZone(bed, 'left');
    expect(polyArea(left)).toBeCloseTo(200 * 60, 6);
    expect(Math.min(...left.map((v) => v.x))).toBeCloseTo(0, 9);
    expect(Math.max(...left.map((v) => v.x))).toBeCloseTo(60, 9);
  });

  it('door zone is door width × 90 cm inside the room', () => {
    const z = doorZone(room, { wall: 0, offset: 20, width: 80 }); // bottom wall, 20 cm from the corner
    expect(polyArea(z)).toBeCloseTo(80 * 90, 6);
    expect(Math.min(...z.map((v) => v.x))).toBeCloseTo(20, 9);
    expect(Math.max(...z.map((v) => v.x))).toBeCloseTo(100, 9);
    expect(Math.max(...z.map((v) => v.y))).toBeCloseTo(90, 9);
  });

  it('a zone can start inside the item (wall-mounted items fall from under themselves)', () => {
    const shelf: Placed = { x: 150, y: 420 - 12.5, w: 80, d: 25, angle: 180 }; // back on the top wall, front faces −y
    const z = zonePolygon(shelf, 'front', 25 + 0.5 * 150, room, -25);
    expect(polyArea(z.poly)).toBeCloseTo(80 * (25 + 75), 3);
    expect(Math.max(...z.poly.map((v) => v.y))).toBeCloseTo(420, 9);
    expect(z.hitsWall).toBe(false);
  });
});
