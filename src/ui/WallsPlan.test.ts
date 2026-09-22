import { describe, it, expect } from 'vitest';
import { explain } from './WallsPlan';
import { shapeKind } from '../state/placement';

describe('refused room outlines', () => {
  it('points at the crossing when walls intersect', () => {
    // Corner 1 of the 300 × 420 room dragged to (100, 500): the first wall crosses the bottom one at y = 420.
    const r = explain([{ x: 0, y: 0 }, { x: 100, y: 500 }, { x: 300, y: 420 }, { x: 0, y: 420 }]);
    expect(r.title).toBe('Стены пересекаются — сдвиньте угол');
    expect(r.at!.y).toBeCloseTo(420, 6);
    expect(r.at!.x).toBeCloseTo(84, 6);
  });

  it('names a wall that became too short', () => {
    expect(explain([{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 300, y: 420 }, { x: 0, y: 420 }]).title).toBe('Стена 1 короче 50 см — раздвиньте углы');
  });

  it('recognises the templates only when every wall is straight across', () => {
    expect(shapeKind([{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 420 }, { x: 0, y: 420 }])).toBe('rect');
    expect(shapeKind([{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 370, y: 480 }, { x: 0, y: 420 }])).toBe('custom');
  });
});
