import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { CATALOG } from './furniture';
import { PANEL_BEDROOM, DEFAULT_SETTINGS } from './presets';
import { periodFor, STOREY_HEIGHT_M } from './buildings';
import { approxPeriod, makeBuilding } from '../physics/building';
import { parseRecord } from '../physics/record';
import { peakFloorAccelAt7, assessRoom } from '../physics/assess';
import { polyArea, polyIntersects, itemPolygon } from '../physics/geometry';

describe('catalogue', () => {
  it('every product has a product page and positive dimensions', () => {
    expect(CATALOG.length).toBeGreaterThan(0);
    for (const p of CATALOG) {
      expect(p.url).toMatch(/^https:\/\//);
      expect(p.w).toBeGreaterThan(0);
      expect(p.d).toBeGreaterThan(0);
      expect(p.height).toBeGreaterThan(0);
    }
  });

  it('keys are unique', () => {
    expect(new Set(CATALOG.map((p) => p.key)).size).toBe(CATALOG.length);
  });
});

describe('buildings', () => {
  it('panel and brick use ASCE 7-16 «all other structural systems»', () => {
    expect(periodFor('panel', 9)).toBeCloseTo(approxPeriod(9, STOREY_HEIGHT_M), 12);
    expect(periodFor('brick', 5)).toBeCloseTo(approxPeriod(5, STOREY_HEIGHT_M), 12);
  });
  it('monolithic frames use the concrete moment-frame coefficients', () => {
    expect(periodFor('monolith', 9)).toBeCloseTo(0.0466 * (9 * 2.8) ** 0.9, 12);
  });
});

describe('preset «Спальня в панельке»', () => {
  const room = PANEL_BEDROOM;

  it('is 3.0 × 4.2 m = 12.6 m²', () => {
    expect(polyArea(room.vertices) / 1e4).toBeCloseTo(12.6, 9);
  });

  it('furniture stands inside the room without overlapping', () => {
    const polys = room.items.map(itemPolygon);
    for (const p of polys) for (const v of p) {
      expect(v.x).toBeGreaterThanOrEqual(-1e-9);
      expect(v.x).toBeLessThanOrEqual(300 + 1e-9);
      expect(v.y).toBeGreaterThanOrEqual(-1e-9);
      expect(v.y).toBeLessThanOrEqual(420 + 1e-9);
    }
    for (let i = 0; i < polys.length; i++) for (let j = i + 1; j < polys.length; j++) {
      expect(polyIntersects(polys[i], polys[j]), `${room.items[i].id} × ${room.items[j].id}`).toBe(false);
    }
  });

  it('tells the story of the design on real physics: wardrobe → pillow, bookcase → exit', () => {
    const s = DEFAULT_SETTINGS;
    const record = parseRecord(JSON.parse(readFileSync(`public/records/${s.recordId}.json`, 'utf-8')));
    const b = makeBuilding(s.totalFloors, periodFor(s.buildingType, s.totalFloors));
    const pfa7G = peakFloorAccelAt7(record, b, s.floor);
    const { assessments } = assessRoom(room, s, { pfa7G });
    const by = Object.fromEntries(assessments.map((a) => [a.itemId, a]));
    expect(by.pax.severity).toBe(4);
    expect(by.billy.severity).toBe(3);
    expect(by.malm.mode).toBe('slides');
    expect(by.mirror.mode).toBe('anchored');
  });
});
