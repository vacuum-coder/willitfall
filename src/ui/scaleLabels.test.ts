import { describe, it, expect } from 'vitest';
import { layoutFlags, type Flag } from './scaleLabels';

const overlap = (a: { x0: number; x1: number; row: number }, b: { x0: number; x1: number; row: number }) =>
  a.row === b.row && a.x0 < b.x1 && b.x0 < a.x1;

describe('threshold labels on the intensity scale', () => {
  const W = 344; // scale width on the desktop
  const design = { x: 0.8 * W, width: 130 }; // «расчётная для Алматы» at 9 points, left of its line, top row

  it('keeps the design layout when there is room: first flag left of its line, second right', () => {
    const flags: Flag[] = [{ id: 'billy', x: 0.246 * W, width: 70 }, { id: 'pax', x: 0.394 * W, width: 60 }]; // positions from the artboard
    const r = layoutFlags(flags, design, W);
    expect(r.placed.find((p) => p.id === 'billy')!.side).toBe('left');
    expect(r.placed.find((p) => p.id === 'pax')!.side).toBe('right');
    expect(r.rows).toBe(2);
  });

  it('never lets two labels overlap, even when thresholds almost coincide', () => {
    const flags: Flag[] = [
      { id: 'a', x: 0.5 * W, width: 70 }, { id: 'b', x: 0.52 * W, width: 70 }, { id: 'c', x: 0.55 * W, width: 70 },
    ];
    const r = layoutFlags(flags, design, W);
    const boxes = [...r.placed, r.design];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(overlap(boxes[i], boxes[j])).toBe(false);
    for (const b of boxes) { expect(b.x0).toBeGreaterThanOrEqual(0); expect(b.x1).toBeLessThanOrEqual(W); }
  });

  it('a label next to the design line does not cover it', () => {
    const r = layoutFlags([{ id: 'a', x: 0.78 * W, width: 70 }], design, W);
    const p = r.placed[0];
    expect(p.row === 0 ? p.x1 <= design.x - design.width || p.x0 >= design.x : true).toBe(true);
    expect(p.x0 < design.x && design.x < p.x1).toBe(false);
  });
});
