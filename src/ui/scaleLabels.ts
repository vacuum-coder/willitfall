// Places the threshold labels above the intensity scale so that none overlaps another, the design-intensity
// label or a marker line. Row 0 is the top row (shared with «расчётная для Алматы»), rows grow downwards.

export interface Flag { id: string; x: number; width: number }
export interface Placed { id: string; row: number; side: 'left' | 'right'; x0: number; x1: number; x: number }

const GAP = 6;

export function layoutFlags(flags: Flag[], design: { x: number; width: number }, W: number) {
  const designBox = { id: 'design', row: 0, side: 'left' as const, x0: design.x - design.width, x1: design.x, x: design.x };
  const placed: Placed[] = [];
  // Vertical marker lines: the design line crosses every row, a flag's line crosses its own row and those above it.
  const blocked = (row: number, x0: number, x1: number) =>
    (x0 < design.x + 1 && design.x - 1 < x1) ||
    placed.some((p) => p.row >= row && x0 < p.x + 1 && p.x - 1 < x1) ||
    [designBox, ...placed].some((b) => b.row === row && x0 < b.x1 + GAP && b.x0 - GAP < x1);

  const sorted = [...flags].sort((a, b) => a.x - b.x);
  sorted.forEach((f, k) => {
    // Like the artboard: the first flag reads to the left of its line, the next one to the right, and so on.
    const sides: ('left' | 'right')[] = k % 2 === 0 ? ['left', 'right'] : ['right', 'left'];
    for (let row = 1; ; row++) {
      const option = sides
        .map((side) => {
          const x0 = side === 'left' ? f.x - f.width - GAP : f.x;
          return { id: f.id, row, side, x0, x1: x0 + f.width + GAP, x: f.x };
        })
        .find((o) => o.x0 >= 0 && o.x1 <= W && !blocked(o.row, o.x0 + (o.side === 'right' ? 1 : 0), o.x1 - (o.side === 'left' ? 1 : 0)));
      if (option) { placed.push(option); break; }
      if (row > flags.length + 1) { placed.push({ id: f.id, row, side: 'right', x0: Math.min(f.x, W - f.width), x1: Math.min(f.x, W - f.width) + f.width, x: f.x }); break; }
    }
  });
  const rows = Math.max(1, ...placed.map((p) => p.row)) + 1;
  return { placed, design: designBox, rows };
}
