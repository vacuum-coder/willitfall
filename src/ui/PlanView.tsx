// 2D plan (artboard C-Desktop, «План»): SVG in centimetres, drawn from the room state and the engine verdict.

import { useRef, type PointerEvent as ReactPointerEvent, type KeyboardEvent } from 'react';
import type { Dispatch } from 'react';
import { C } from './ds';
import { status, type Status } from './verdict';
import { num } from './format';
import { doorZone, type Side, type Vec } from '../physics/geometry';
import { wallFrames } from '../state/placement';
import type { Action } from '../state/roomReducer';
import type { Item, ItemAssessment, Room } from '../physics/types';

const TEXT = { fontFamily: 'Manrope, sans-serif' } as const;
const WALL = 12;

const rad = (deg: number) => (deg * Math.PI) / 180;
/** Local (s along width, t along depth, +t = front) → plan coordinates. */
const toWorld = (i: Item, s: number, t: number): Vec => {
  const a = rad(i.angle);
  return { x: i.x + s * Math.cos(a) - t * Math.sin(a), y: i.y + s * Math.sin(a) + t * Math.cos(a) };
};

const GENITIVE: Record<string, string> = {
  wardrobe: 'шкафа', bookshelf: 'стеллажа', dresser: 'комода', mirror: 'зеркала', fridge: 'холодильника',
  wallUnit: 'стенки', nightstand: 'тумбы', tv: 'телевизора', wallShelf: 'полки', picture: 'картины', vase: 'вазы', bed: 'кровати',
};

const FILL: Record<Status, { fill: string; stroke: string }> = {
  falls: { fill: C.dangerTint, stroke: C.danger },
  slides: { fill: C.slideTint, stroke: C.slide },
  safe: { fill: C.safeTint, stroke: C.safe },
  stands: { fill: C.surface, stroke: C.text },
};

/** Outer outline of the walls: each edge pushed WALL cm outwards, corners mitred. */
function outerOutline(v: Vec[]): Vec[] {
  const f = wallFrames(v), n = v.length;
  return v.map((_, i) => {
    const e1 = f[(i - 1 + n) % n], e2 = f[i];
    const p1 = { x: e1.a.x - e1.inward.x * WALL, y: e1.a.y - e1.inward.y * WALL };
    const p2 = { x: e2.a.x - e2.inward.x * WALL, y: e2.a.y - e2.inward.y * WALL };
    const den = e1.t.x * e2.t.y - e1.t.y * e2.t.x;
    if (Math.abs(den) < 1e-9) return p2;
    const k = ((p2.x - p1.x) * e2.t.y - (p2.y - p1.y) * e2.t.x) / den;
    return { x: p1.x + e1.t.x * k, y: p1.y + e1.t.y * k };
  });
}

const pts = (p: Vec[]) => p.map((q) => `${q.x},${q.y}`).join(' ');
const path = (p: Vec[]) => `M${p.map((q) => `${q.x},${q.y}`).join(' L')} Z`;

interface Props {
  room: Room;
  byId: Map<string, ItemAssessment>;
  selectedId: string | null;
  dispatch: Dispatch<Action>;
  width?: number;
  height?: number;
}

export function PlanView({ room, byId, selectedId, dispatch, width = 240, height = 324 }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; kind: 'move' | 'rotate'; start: Vec; item: Item; pointer: number } | null>(null);
  const frame = useRef(0);

  const xs = room.vertices.map((v) => v.x), ys = room.vertices.map((v) => v.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const viewBox = `${x0 - 60} ${y0 - 50} ${x1 - x0 + 100} ${y1 - y0 + 120}`;

  const toPlan = (e: { clientX: number; clientY: number }): Vec => {
    const s = svg.current!, m = s.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return { x: p.x, y: p.y };
  };

  const onDown = (e: ReactPointerEvent, item: Item, kind: 'move' | 'rotate') => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { id: item.id, kind, start: toPlan(e), item, pointer: e.pointerId };
    dispatch({ type: 'SELECT_ITEM', id: item.id });
  };
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointer) return;
    const p = toPlan(e), shift = e.shiftKey;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (d.kind === 'move') {
        dispatch({ type: 'MOVE_ITEM', id: d.id, x: d.item.x + p.x - d.start.x, y: d.item.y + p.y - d.start.y });
      } else {
        const a0 = Math.atan2(d.start.y - d.item.y, d.start.x - d.item.x), a1 = Math.atan2(p.y - d.item.y, p.x - d.item.x);
        const raw = d.item.angle + ((a1 - a0) * 180) / Math.PI;
        dispatch({ type: 'SET_ANGLE', id: d.id, angle: shift ? Math.round(raw) : Math.round(raw / 15) * 15 });
      }
    });
  };
  const onUp = (e: ReactPointerEvent) => {
    if (drag.current?.pointer === e.pointerId) drag.current = null;
  };
  const onKey = (e: KeyboardEvent, item: Item) => {
    const step = e.shiftKey ? 1 : 5;
    const move = (dx: number, dy: number) => dispatch({ type: 'MOVE_ITEM', id: item.id, x: item.x + dx, y: item.y + dy });
    if (e.key === 'ArrowLeft') move(-step, 0);
    else if (e.key === 'ArrowRight') move(step, 0);
    else if (e.key === 'ArrowUp') move(0, -step);
    else if (e.key === 'ArrowDown') move(0, step);
    else if (e.key === 'r' || e.key === 'к') dispatch({ type: 'SET_ANGLE', id: item.id, angle: item.angle + (e.shiftKey ? -15 : 15) });
    else if (e.key === 'Delete' || e.key === 'Backspace') dispatch({ type: 'DELETE_ITEM', id: item.id });
    else if (e.key === 'Enter' || e.key === ' ') dispatch({ type: 'SELECT_ITEM', id: item.id });
    else return;
    e.preventDefault();
  };

  const frames = wallFrames(room.vertices);
  const outer = outerOutline(room.vertices);
  const bed = room.items.filter((i) => i.kind === 'bed');
  const others = room.items.filter((i) => i.kind !== 'bed');
  // Drawing order: floor items first, then what stands on them, then wall items.
  const order = (i: Item) => (i.mount.kind === 'floor' ? 0 : i.mount.kind === 'onItem' ? 1 : 2);
  others.sort((a, b) => order(a) - order(b));
  const selected = room.items.find((i) => i.id === selectedId);
  const selA = selected && byId.get(selected.id);

  const opening = (wall: number, offset: number, width: number) => {
    const f = frames[wall];
    const p0 = { x: f.a.x + f.t.x * offset, y: f.a.y + f.t.y * offset };
    const p1 = { x: p0.x + f.t.x * width, y: p0.y + f.t.y * width };
    const out = (p: Vec, k: number) => ({ x: p.x - f.inward.x * k, y: p.y - f.inward.y * k });
    return { f, p0, p1, out };
  };

  return (
    <svg
      ref={svg}
      viewBox={viewBox}
      width={width}
      height={height}
      role="img"
      aria-label={planLabel(room, byId)}
      style={{ display: 'block', flex: 'none', touchAction: 'none', userSelect: 'none' }}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerDown={() => dispatch({ type: 'SELECT_ITEM', id: null })}
    >
      <defs>
        <pattern id="hatch2d" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" style={{ stroke: C.danger }} strokeWidth="1.3" strokeOpacity="0.5" />
        </pattern>
        <marker id="pArrOchre" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,1 L9,5 L0,9 z" style={{ fill: C.slide }} />
        </marker>
        <marker id="pArrInk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M1,1.5 L9,5 L1,8.5" fill="none" style={{ stroke: C.text }} strokeWidth="1.3" />
        </marker>
      </defs>

      <polygon points={pts(room.vertices)} style={{ fill: C.surface2 }} />

      {bed.map((b) => (
        <g key={b.id} {...itemHandlers(b)}>
          <BedShape item={b} />
        </g>
      ))}

      {room.items.map((i) => {
        const a = byId.get(i.id);
        if (!a || status(a) !== 'falls') return null;
        return a.zones.map((z, k) => (
          <g key={`${i.id}-z${k}`} pointerEvents="none">
            <path d={path(z)} style={{ fill: C.dangerZone }} />
            <path d={path(z)} fill="url(#hatch2d)" style={{ stroke: C.danger }} strokeWidth="1.2" strokeDasharray="6 4" />
          </g>
        ));
      })}

      {room.openings.filter((o) => o.kind === 'door').map((o, k) => {
        const { f, p0, p1 } = opening(o.wall, o.offset, o.width);
        const hinge = o.swing === 'in-left' ? p0 : p1, jamb = o.swing === 'in-left' ? p1 : p0;
        const tip = { x: hinge.x + f.inward.x * o.width, y: hinge.y + f.inward.y * o.width };
        const v1 = { x: tip.x - hinge.x, y: tip.y - hinge.y }, v2 = { x: jamb.x - hinge.x, y: jamb.y - hinge.y };
        const sweep = v1.x * v2.y - v1.y * v2.x > 0 ? 1 : 0;
        const mid = { x: (p0.x + p1.x) / 2 + f.inward.x * 11, y: (p0.y + p1.y) / 2 + f.inward.y * 11 };
        return (
          <g key={`door${k}`} pointerEvents="none">
            <path d={path(doorZone(room.vertices, o))} fill="none" style={{ stroke: C.safe }} strokeWidth="1.2" strokeDasharray="4 3" />
            <path d={`M${tip.x},${tip.y} A${o.width},${o.width} 0 0 ${sweep} ${jamb.x},${jamb.y}`} fill="none" style={{ stroke: C.text }} strokeWidth="0.9" strokeDasharray="3 3" />
            <line x1={hinge.x} y1={hinge.y} x2={tip.x} y2={tip.y} style={{ stroke: C.text }} strokeWidth="2.4" />
            <text x={mid.x} y={mid.y} textAnchor="middle" {...TEXT} fontSize="20" fontWeight="700" style={{ fill: C.safe, stroke: C.surface2 }} strokeWidth="4" strokeLinejoin="round" paintOrder="stroke">выход</text>
          </g>
        );
      })}

      {others.map((i) => {
        const a = byId.get(i.id);
        const st = a ? status(a) : 'stands';
        return (
          <g key={i.id} {...itemHandlers(i)}>
            <ItemShape item={i} st={st} selected={i.id === selectedId} />
          </g>
        );
      })}

      <path d={`${path(outer)} ${path([...room.vertices].reverse())}`} fillRule="evenodd" style={{ fill: C.poche }} pointerEvents="none" />
      {room.openings.map((o, k) => {
        const { p0, p1, out } = opening(o.wall, o.offset, o.width);
        const quad = [p0, p1, out(p1, WALL), out(p0, WALL)];
        return o.kind === 'door'
          ? <path key={`op${k}`} d={path(quad)} style={{ fill: C.surface }} pointerEvents="none" />
          : (
            <g key={`op${k}`} pointerEvents="none">
              <path d={path(quad)} style={{ fill: C.surface, stroke: C.text }} strokeWidth="0.8" />
              <line x1={out(p0, WALL / 2).x} y1={out(p0, WALL / 2).y} x2={out(p1, WALL / 2).x} y2={out(p1, WALL / 2).y} style={{ stroke: C.text }} strokeWidth="0.8" />
            </g>
          );
      })}

      {selected && selA && status(selA) === 'falls' && selA.sides[0] && selected.mount.kind !== 'wall' && (
        <FallDimension item={selected} side={selA.sides[0]} zone={selA.zones[selA.zones.length - 1]} />
      )}
      {selected && <Selection item={selected} onRotate={(e) => onDown(e, selected, 'rotate')} />}

      {others.concat(bed).map((i) => <Label key={`l-${i.id}`} item={i} />)}

      <Dimensions x0={x0} x1={x1} y0={y0} y1={y1} />
    </svg>
  );

  function itemHandlers(i: Item) {
    return {
      tabIndex: 0,
      role: 'button',
      'aria-label': `${i.name}, ${i.w} × ${i.d} × ${i.height} см`,
      'aria-pressed': i.id === selectedId,
      style: { cursor: 'grab', outline: 'none' },
      onPointerDown: (e: ReactPointerEvent) => onDown(e, i, 'move'),
      onKeyDown: (e: KeyboardEvent) => onKey(e, i),
      onFocus: () => dispatch({ type: 'SELECT_ITEM', id: i.id }),
    };
  }
}

function planLabel(room: Room, byId: Map<string, ItemAssessment>): string {
  const xs = room.vertices.map((v) => v.x), ys = room.vertices.map((v) => v.y);
  const parts = room.items.filter((i) => i.kind !== 'bed').map((i) => {
    const a = byId.get(i.id);
    return `${i.name.toLowerCase()} — ${a ? { falls: 'упадёт', slides: 'сдвинется', safe: 'закреплён', stands: 'устоит' }[status(a)] : 'считается'}`;
  });
  return `План комнаты ${Math.round(Math.max(...xs) - Math.min(...xs))} на ${Math.round(Math.max(...ys) - Math.min(...ys))} см: ${parts.join('; ')}.`;
}

const HEAD_TURN: Record<Side, number> = { back: 0, front: 180, left: -90, right: 90 };

function BedShape({ item }: { item: Item }) {
  const turn = HEAD_TURN[item.headSide ?? 'back'];
  const side = turn === 90 || turn === -90;
  const W = side ? item.d : item.w, D = side ? item.w : item.d;
  const top = -D / 2, bottom = D / 2, l = -W / 2, r = W / 2;
  return (
    <g transform={`translate(${item.x} ${item.y}) rotate(${item.angle})`}>
      <rect x={-item.w / 2} y={-item.d / 2} width={item.w} height={item.d} rx="3" style={{ fill: C.bg, stroke: C.text }} strokeWidth="1.2" />
      <g transform={`rotate(${turn})`}>
        <path d={`M${l},${top + 70} H${r} V${bottom - 3} A3,3 0 0 1 ${r - 3},${bottom} H${l + 3} A3,3 0 0 1 ${l},${bottom - 3} Z`} style={{ fill: C.safeTint, stroke: C.safe }} strokeWidth="1" />
        <rect x={l + 10} y={top + 8} width={W - 20} height="42" rx="8" style={{ fill: C.surface, stroke: C.text }} strokeWidth="1" />
      </g>
    </g>
  );
}

function ItemShape({ item, st, selected }: { item: Item; st: Status; selected: boolean }) {
  const { w, d } = item;
  const { fill, stroke } = FILL[st];
  return (
    <g transform={`translate(${item.x} ${item.y}) rotate(${item.angle})`}>
      <rect x={-w / 2} y={-d / 2} width={w} height={d} style={{ fill, stroke }} strokeWidth={selected ? 1.6 : 1.4} />
      {st === 'safe' && (
        <path d={`M${w / 2 - 8},${-d / 2 + 8} H${w / 2 - 20} V${-d / 2 + 20}`} fill="none" style={{ stroke: C.safe }} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {st === 'slides' && (
        <line x1={w / 2 - 14} y1={d / 2 + 9} x2={w / 2 - 14} y2={d / 2 + 53} style={{ stroke: C.slide }} strokeWidth="2" markerEnd="url(#pArrOchre)" />
      )}
    </g>
  );
}

/** Name of the item: inside when it fits, otherwise next to it on a halo. */
function Label({ item }: { item: Item }) {
  if (item.kind === 'bed') {
    const turn = HEAD_TURN[item.headSide ?? 'back'];
    const D = turn === 90 || turn === -90 ? item.w : item.d;
    const t = rad(turn), local = { s: -(D / 2 - 36) * Math.sin(t), t: (D / 2 - 36) * Math.cos(t) };
    const p = toWorld(item, local.s, local.t);
    return <text x={p.x} y={p.y + 7} textAnchor="middle" {...TEXT} fontSize="20" fontWeight="600" style={{ fill: C.text }} pointerEvents="none">{item.name}</text>;
  }
  const textLen = item.name.length * 12.5;
  const long = Math.max(item.w, item.d), short = Math.min(item.w, item.d);
  if (textLen + 12 <= long && short >= 24) {
    // Along the longer side, never upside down.
    let phi = item.angle + (item.w >= item.d ? 0 : 90);
    phi = ((((phi + 90) % 180) + 180) % 180) - 90;
    const down = { x: -Math.sin(rad(phi)), y: Math.cos(rad(phi)) };
    const x = item.x + down.x * 7, y = item.y + down.y * 7;
    return (
      <text x={x} y={y} transform={`rotate(${phi} ${x} ${y})`} textAnchor="middle" {...TEXT} fontSize="20" fontWeight="700" style={{ fill: C.text }} pointerEvents="none">
        {item.name}
      </text>
    );
  }
  const a = rad(item.angle);
  const halfX = (Math.abs(Math.cos(a)) * item.w + Math.abs(Math.sin(a)) * item.d) / 2;
  const toRight = item.x < 150;
  return (
    <text x={toRight ? item.x + halfX + 10 : item.x - halfX - 10} y={item.y + 7} textAnchor={toRight ? 'start' : 'end'} {...TEXT} fontSize="20" fontWeight="700" style={{ fill: C.text, stroke: C.surface2 }} strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" pointerEvents="none">
      {item.name}
    </text>
  );
}

function Selection({ item, onRotate }: { item: Item; onRotate: (e: ReactPointerEvent) => void }) {
  const w = item.w + 12, d = item.d + 12;
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const;
  return (
    <g transform={`translate(${item.x} ${item.y}) rotate(${item.angle})`}>
      <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="none" style={{ stroke: C.text }} strokeWidth="1.2" strokeDasharray="5 4" pointerEvents="none" />
      {corners.map(([sx, sy]) => (
        <rect
          key={`${sx}${sy}`}
          x={(sx * w) / 2 - 4}
          y={(sy * d) / 2 - 4}
          width="8"
          height="8"
          style={{ fill: C.surface, stroke: C.text, cursor: 'grab' }}
          strokeWidth="1.4"
          onPointerDown={onRotate}
        >
          <title>Повернуть: тяните за угол, с Shift — без шага 15°</title>
        </rect>
      ))}
    </g>
  );
}

/** «2,4 м — высота шкафа» across the fall zone of the selected item. */
function FallDimension({ item, side, zone }: { item: Item; side: Side; zone?: Vec[] }) {
  if (!zone?.length) return null;
  const a = rad(item.angle);
  const u = { x: Math.cos(a), y: Math.sin(a) }, n = { x: -Math.sin(a), y: Math.cos(a) };
  const out = side === 'front' ? n : side === 'back' ? { x: -n.x, y: -n.y } : side === 'right' ? u : { x: -u.x, y: -u.y };
  const along = side === 'front' || side === 'back' ? u : n;
  const half = side === 'front' || side === 'back' ? item.d / 2 : item.w / 2;
  const edge = side === 'front' || side === 'back' ? item.w / 2 : item.d / 2;
  const face = { x: item.x + out.x * half + along.x * (edge - 16), y: item.y + out.y * half + along.y * (edge - 16) };
  const reach = Math.max(...zone.map((v) => (v.x - face.x) * out.x + (v.y - face.y) * out.y));
  const p0 = { x: face.x + out.x * 4, y: face.y + out.y * 4 }, p1 = { x: face.x + out.x * (reach - 4), y: face.y + out.y * (reach - 4) };
  const mid = { x: (p0.x + p1.x) / 2 - along.x * 9, y: (p0.y + p1.y) / 2 - along.y * 9 };
  const text = `${num(reach / 100)} м — ${Math.abs(reach - item.height) < 1 ? `высота ${GENITIVE[item.kind] ?? 'предмета'}` : 'дальность падения'}`;
  return (
    <g pointerEvents="none">
      <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} style={{ stroke: C.text }} strokeWidth="1" markerStart="url(#pArrInk)" markerEnd="url(#pArrInk)" />
      <text x={mid.x} y={mid.y} textAnchor="middle" {...TEXT} fontSize="20" fontWeight="700" style={{ fill: C.text, stroke: C.surface }} strokeWidth="5" strokeLinejoin="round" paintOrder="stroke">{text}</text>
    </g>
  );
}

function Dimensions({ x0, x1, y0, y1 }: { x0: number; x1: number; y0: number; y1: number }) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  return (
    <g pointerEvents="none">
      <g style={{ stroke: C.text2 }} strokeWidth="0.9">
        <line x1={x0} y1={y0 - 16} x2={x0} y2={y0 - 34} />
        <line x1={x1} y1={y0 - 16} x2={x1} y2={y0 - 34} />
        <line x1={x0} y1={y0 - 28} x2={x1} y2={y0 - 28} />
        <line x1={x0 - 5} y1={y0 - 23} x2={x0 + 5} y2={y0 - 33} />
        <line x1={x1 - 5} y1={y0 - 23} x2={x1 + 5} y2={y0 - 33} />
        <line x1={x0 - 16} y1={y0} x2={x0 - 34} y2={y0} />
        <line x1={x0 - 16} y1={y1} x2={x0 - 34} y2={y1} />
        <line x1={x0 - 28} y1={y0} x2={x0 - 28} y2={y1} />
        <line x1={x0 - 33} y1={y0 + 5} x2={x0 - 23} y2={y0 - 5} />
        <line x1={x0 - 33} y1={y1 + 5} x2={x0 - 23} y2={y1 - 5} />
      </g>
      <text x={mx} y={y0 - 34} textAnchor="middle" {...TEXT} fontSize="20" fontWeight="600" style={{ fill: C.text2 }}>{Math.round(x1 - x0)}</text>
      <text x={x0 - 35} y={my} transform={`rotate(-90 ${x0 - 35} ${my})`} textAnchor="middle" {...TEXT} fontSize="20" fontWeight="600" style={{ fill: C.text2 }}>{Math.round(y1 - y0)}</text>
      <rect x={x0} y={y1 + 30} width="50" height="6" style={{ fill: C.text }} />
      <rect x={x0 + 50} y={y1 + 30} width="50" height="6" style={{ fill: C.surface, stroke: C.text }} strokeWidth="1" />
      <text x={x0} y={y1 + 62} textAnchor="middle" {...TEXT} fontSize="20" style={{ fill: C.text2 }}>0</text>
      <text x={x0 + 100} y={y1 + 62} textAnchor="middle" {...TEXT} fontSize="20" style={{ fill: C.text2 }}>1 м</text>
    </g>
  );
}
