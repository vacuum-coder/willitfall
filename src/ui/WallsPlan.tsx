// Walls mode plan (artboard C-Walls-Desktop): drag the round corner handles, «+» in the middle of a wall adds
// a corner, a selected corner is removed with Delete. Furniture is hidden while the outline is edited.

import { useRef, useState, type Dispatch, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { C, fs, sp, R, button } from './ds';
import { num } from './format';
import { wallFrames, grid, isValidRoom, doorAt, MIN_WALL_CM } from '../state/placement';
import { doorZone } from '../physics/geometry';
import type { Action } from '../state/roomReducer';
import type { Vec } from '../physics/geometry';
import type { Room } from '../physics/types';

const TEXT = { fontFamily: 'Manrope, sans-serif' } as const;
const WALL = 12;

export function WallsPlan({ room, dispatch, width = 330, height = 330 }: { room: Room; dispatch: Dispatch<Action>; width?: number; height?: number }) {
  const svg = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);
  // A corner position the room refused: shown in red with the reason until the user moves on or cancels.
  const [attempt, setAttempt] = useState<Vec[] | null>(null);
  const drag = useRef<{ index: number; pointer: number } | null>(null);
  const doorDrag = useRef<number | null>(null);
  const frame = useRef(0);
  const v = room.vertices, n = v.length;
  const frames = wallFrames(v);
  const xs = v.map((p) => p.x), ys = v.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const side = Math.max(x1 - x0, y1 - y0) + 140;
  const viewBox = `${(x0 + x1) / 2 - side / 2} ${(y0 + y1) / 2 - side / 2} ${side} ${side}`;

  const toPlan = (e: { clientX: number; clientY: number }): Vec => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };
  const onDown = (e: ReactPointerEvent, index: number) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { index, pointer: e.pointerId };
    setActive(index);
  };
  const onMove = (e: ReactPointerEvent) => {
    if (doorDrag.current === e.pointerId) {
      const door = room.openings.find((o) => o.kind === 'door');
      const at = door && doorAt(v, toPlan(e), door.width);
      if (door && at) dispatch({ type: 'SET_DOOR', ...at, width: door.width, swing: door.swing });
      return;
    }
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    const p = toPlan(e);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const to = { x: grid(p.x), y: grid(p.y) };
      const candidate = v.map((q, i) => (i === d.index ? to : q));
      if (isValidRoom(candidate)) { setAttempt(null); dispatch({ type: 'MOVE_VERTEX', index: d.index, to }); } else setAttempt(candidate);
    });
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.shiftKey ? 1 : 5, p = v[i];
    const to = e.key === 'ArrowLeft' ? { x: p.x - step, y: p.y } : e.key === 'ArrowRight' ? { x: p.x + step, y: p.y }
      : e.key === 'ArrowUp' ? { x: p.x, y: p.y - step } : e.key === 'ArrowDown' ? { x: p.x, y: p.y + step } : null;
    if (to) {
      const candidate = v.map((q, k) => (k === i ? to : q));
      if (isValidRoom(candidate)) { setAttempt(null); dispatch({ type: 'MOVE_VERTEX', index: i, to }); } else setAttempt(candidate);
    }
    else if (e.key === 'Delete' || e.key === 'Backspace') { dispatch({ type: 'REMOVE_VERTEX', index: i }); setActive(null); }
    else return;
    e.preventDefault();
  };

  const outline = (p: Vec[]) => `M${p.map((q) => `${q.x},${q.y}`).join(' L')} Z`;
  const outer = v.map((_, i) => {
    const e1 = frames[(i - 1 + n) % n], e2 = frames[i];
    const p1 = { x: e1.a.x - e1.inward.x * WALL, y: e1.a.y - e1.inward.y * WALL }, p2 = { x: e2.a.x - e2.inward.x * WALL, y: e2.a.y - e2.inward.y * WALL };
    const den = e1.t.x * e2.t.y - e1.t.y * e2.t.x;
    if (Math.abs(den) < 1e-9) return p2;
    const k = ((p2.x - p1.x) * e2.t.y - (p2.y - p1.y) * e2.t.x) / den;
    return { x: p1.x + e1.t.x * k, y: p1.y + e1.t.y * k };
  });

  const problem = attempt && explain(attempt);
  return (
    <div>
    <svg ref={svg} viewBox={viewBox} width={width} height={height} role="img" aria-label={`Контур комнаты: ${n} стен`} style={{ display: 'block', touchAction: 'none', userSelect: 'none' }} onPointerMove={onMove} onPointerUp={() => { drag.current = null; doorDrag.current = null; }} onPointerCancel={() => { drag.current = null; doorDrag.current = null; }}>
      <defs>
        <clipPath id="roomClip"><path d={outline(v)} /></clipPath>
      </defs>
      <path d={outline(v)} style={{ fill: C.surface2 }} />
      <g clipPath="url(#roomClip)">
        {Array.from({ length: Math.ceil((x1 - x0) / 30) }, (_, k) => <line key={`gx${k}`} x1={x0 + k * 30} y1={y0} x2={x0 + k * 30} y2={y1} style={{ stroke: C.rule }} strokeWidth="0.6" />)}
        {Array.from({ length: Math.ceil((y1 - y0) / 30) }, (_, k) => <line key={`gy${k}`} x1={x0} y1={y0 + k * 30} x2={x1} y2={y0 + k * 30} style={{ stroke: C.rule }} strokeWidth="0.6" />)}
      </g>
      <path d={`${outline(outer)} ${outline([...v].reverse())}`} fillRule="evenodd" style={{ fill: C.poche }} />

      {room.openings.map((o, k) => {
        const f = frames[o.wall];
        if (!f) return null;
        const p0 = { x: f.a.x + f.t.x * o.offset, y: f.a.y + f.t.y * o.offset }, p1 = { x: p0.x + f.t.x * o.width, y: p0.y + f.t.y * o.width };
        const out = (p: Vec, d: number) => ({ x: p.x - f.inward.x * d, y: p.y - f.inward.y * d });
        const quad = outline([p0, p1, out(p1, WALL), out(p0, WALL)]);
        if (o.kind === 'window') return <path key={k} d={quad} style={{ fill: C.surface, stroke: C.text }} strokeWidth="0.8" />;
        const inward = !o.swing || o.swing.startsWith('in');
        const hinge = o.swing?.endsWith('left') ? p0 : p1, jamb = o.swing?.endsWith('left') ? p1 : p0;
        const dir = inward ? f.inward : { x: -f.inward.x, y: -f.inward.y };
        const tip = { x: hinge.x + dir.x * o.width, y: hinge.y + dir.y * o.width };
        const c = (tip.x - hinge.x) * (jamb.y - hinge.y) - (tip.y - hinge.y) * (jamb.x - hinge.x);
        return (
          <g
            key={k}
            style={{ cursor: 'grab' }}
            onPointerDown={(e) => { e.stopPropagation(); (e.currentTarget as Element).setPointerCapture(e.pointerId); doorDrag.current = e.pointerId; }}
          >
            <title>Перетащите дверь вдоль стены</title>
            <path d={`${quad} ${outline(doorZone(v, o))}`} style={{ fill: C.surface, fillOpacity: 0 }} />
            <path d={quad} style={{ fill: C.surface }} />
            <path d={`M${tip.x},${tip.y} A${o.width},${o.width} 0 0 ${c > 0 ? 1 : 0} ${jamb.x},${jamb.y}`} fill="none" style={{ stroke: C.text }} strokeWidth="0.9" strokeDasharray="3 3" />
            <line x1={hinge.x} y1={hinge.y} x2={tip.x} y2={tip.y} style={{ stroke: C.text }} strokeWidth="2" />
          </g>
        );
      })}

      {frames.map((f, i) => {
        const mid = { x: (f.a.x + f.b.x) / 2, y: (f.a.y + f.b.y) / 2 };
        const lab = { x: mid.x - f.inward.x * 34, y: mid.y - f.inward.y * 34 };
        let ang = (Math.atan2(f.t.y, f.t.x) * 180) / Math.PI;
        ang = ((((ang + 90) % 180) + 180) % 180) - 90;
        return (
          <g key={`w${i}`}>
            <text x={lab.x} y={lab.y + 6} transform={`rotate(${ang} ${lab.x} ${lab.y})`} textAnchor="middle" {...TEXT} fontSize="17" fontWeight="600" style={{ fill: C.text }}>
              {i + 1} · {num(f.len / 100)} м
            </text>
            {f.len >= 100 && (
              <g role="button" tabIndex={0} aria-label={`Добавить угол на стене ${i + 1}`} style={{ cursor: 'copy' }} onClick={() => dispatch({ type: 'ADD_VERTEX', wall: i })} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && dispatch({ type: 'ADD_VERTEX', wall: i })}>
                <circle cx={mid.x} cy={mid.y} r="9" style={{ fill: C.surface, stroke: C.text }} strokeWidth="1.2" />
                <path d={`M${mid.x - 5},${mid.y} h10 M${mid.x},${mid.y - 5} v10`} style={{ stroke: C.text }} strokeWidth="1.4" />
              </g>
            )}
          </g>
        );
      })}

      {attempt && (
        <g pointerEvents="none">
          <path d={outline(v)} fill="none" style={{ stroke: C.text2 }} strokeWidth="1.2" strokeDasharray="5 4" />
          <path d={outline(attempt)} fill="none" style={{ stroke: C.danger }} strokeWidth="6" strokeLinejoin="round" opacity="0.8" />
          {problem?.at && (
            <g>
              <circle cx={problem.at.x} cy={problem.at.y} r="12" style={{ fill: C.surface, stroke: C.danger }} strokeWidth="2" />
              <path d={`M${problem.at.x - 5},${problem.at.y - 5} l10,10 M${problem.at.x + 5},${problem.at.y - 5} l-10,10`} style={{ stroke: C.danger }} strokeWidth="2" />
            </g>
          )}
        </g>
      )}

      {v.map((p, i) => (
        <circle
          key={`v${i}`}
          cx={p.x}
          cy={p.y}
          r={active === i ? 13 : 11}
          role="button"
          tabIndex={0}
          aria-label={`Угол ${i + 1}: ${Math.round(p.x)}, ${Math.round(p.y)} см. Стрелки двигают, Delete удаляет`}
          style={{ fill: active === i ? C.text : C.surface, stroke: C.text, cursor: 'grab', outline: 'none' }}
          strokeWidth="2"
          onPointerDown={(e) => onDown(e, i)}
          onFocus={() => setActive(i)}
          onKeyDown={(e) => onKey(e, i)}
        />
      ))}
    </svg>
    {problem && (
      <div role="alert" style={{ marginTop: sp(12), padding: sp(12, 14), border: `1px solid ${C.danger}`, borderRadius: R.md, background: C.surface }}>
        <p style={{ margin: 0, ...fs(14), fontWeight: 600, color: C.danger }}>⚠ {problem.title}</p>
        <p style={{ margin: sp(4, 0, 0), ...fs(13), color: C.text2 }}>Расчёт и 3D обновятся, когда форма станет правильной. Пока остаётся прежняя форма — пунктиром.</p>
        <button type="button" onClick={() => setAttempt(null)} style={{ ...button.secondary, marginTop: sp(10) }}>Отменить</button>
      </div>
    )}
    </div>
  );
}

/** Why an outline is refused, and where to look. */
export function explain(p: Vec[]): { title: string; at?: Vec } {
  const n = p.length;
  for (let i = 0; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n];
    if (Math.hypot(b.x - a.x, b.y - a.y) < MIN_WALL_CM) return { title: `Стена ${i + 1} короче ${MIN_WALL_CM} см — раздвиньте углы`, at: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  }
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    const at = cross(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n]);
    if (at) return { title: 'Стены пересекаются — сдвиньте угол', at };
  }
  return { title: 'Такая форма не получается — сдвиньте угол' };
}

function cross(a: Vec, b: Vec, c: Vec, d: Vec): Vec | null {
  const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den;
  const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) } : null;
}
