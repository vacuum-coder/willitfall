// Right column in walls mode (C-Walls-Desktop): the shape summary and the door card.

import type { CSSProperties } from 'react';
import { C, FONT, fs, sp, R, H, card, selectStyle } from './ds';
import { Chevron } from './icons';
import { num } from './format';
import { useRoom } from '../state/RoomContext';
import { wallFrames, isValidRoom, shapeKind } from '../state/placement';
import { polyArea } from '../physics/geometry';
import { CEILING_CM } from '../data/presets';
import type { Opening } from '../physics/types';

const dt: CSSProperties = { padding: sp(6, 0), borderTop: `1px solid ${C.border}`, color: C.text2 };
const dd: CSSProperties = { margin: 0, padding: sp(6, 0), borderTop: `1px solid ${C.border}`, fontWeight: 700, textAlign: 'right' };

const SHAPES = {
  rect: { name: 'Прямоугольная', template: 'шаблон «Прямоугольная»' },
  L: { name: 'Г-образная', template: 'шаблон «Г»' },
  U: { name: 'П-образная', template: 'шаблон «П»' },
  custom: { name: 'Свой контур', template: 'углы расставлены вручную' },
};

export function ShapeCard() {
  const { state } = useRoom();
  const v = state.room.vertices, frames = wallFrames(v);
  const valid = isValidRoom(v);
  const door = state.room.openings.find((o) => o.kind === 'door');
  const doorFits = door && frames[door.wall] && door.offset + door.width <= frames[door.wall].len + 1e-6;
  const { name, template } = SHAPES[shapeKind(v)];
  return (
    <section style={{ ...card, padding: sp(20) }} aria-labelledby="h-shape">
      <p style={{ margin: 0, ...fs(12), fontWeight: 600, color: C.text2 }}>Форма комнаты</p>
      <div style={{ marginTop: sp(4), display: 'flex', alignItems: 'baseline', gap: sp(10) }}>
        <h2 id="h-shape" style={{ margin: 0, fontFamily: FONT.display, fontWeight: 600, ...fs(26) }}>{name}</h2>
        <span style={{ ...fs(13), color: C.text2 }}>{v.length} стен · {template}</span>
      </div>
      <dl style={{ margin: sp(14, 0, 0), display: 'grid', gridTemplateColumns: '1fr auto', ...fs(14) }}>
        <dt style={dt}>Площадь</dt><dd style={dd}>{num(polyArea(v) / 1e4)} м²</dd>
        <dt style={dt}>Периметр</dt><dd style={dd}>{num(frames.reduce((s, f) => s + f.len, 0) / 100)} м</dd>
        <dt style={{ ...dt, borderBottom: `1px solid ${C.border}` }}>Высота потолка</dt><dd style={{ ...dd, borderBottom: `1px solid ${C.border}` }}>{num(CEILING_CM / 100, 1)} м</dd>
      </dl>
      <p style={{ margin: sp(14, 0, 0), display: 'flex', alignItems: 'center', gap: sp(8), ...fs(14), fontWeight: 600, color: valid ? C.text : C.danger }}>
        {valid ? 'Стены не пересекаются' : 'Стены пересекаются'}
        <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: R.full, background: valid ? C.safeTint : C.dangerTint, color: valid ? C.safe : C.danger, ...fs(12) }}>{valid ? '✓' : '!'}</span>
      </p>
      <p style={{ margin: sp(4, 0, 0), ...fs(13), color: C.text2 }}>
        Контур замкнут{door ? (doorFits ? `, дверь ${num(door.width / 100, 1)} м помещается на стене ${door.wall + 1}.` : `, но дверь ${num(door.width / 100, 1)} м не помещается на стене ${door.wall + 1}.`) : '.'}
      </p>
      <div style={{ marginTop: sp(14), paddingTop: sp(12), borderTop: `1px solid ${C.border}` }}>
        <p style={{ margin: 0, ...fs(12), fontWeight: 600, color: C.text2 }}>Как править</p>
        <ul style={{ margin: sp(8, 0, 0), padding: 0, listStyle: 'none', ...fs(14), color: C.text, display: 'flex', flexDirection: 'column', gap: sp(10) }}>
          <li style={{ display: 'flex', gap: sp(10) }}><span aria-hidden="true" style={{ flex: 'none', width: 12, height: 12, marginTop: sp(4), borderRadius: R.full, border: `2px solid ${C.text}` }} />Тяните круглую ручку — угол двигается, длины стен пересчитываются</li>
          <li style={{ display: 'flex', gap: sp(10) }}><span aria-hidden="true" style={{ flex: 'none', width: 16, textAlign: 'center', fontWeight: 700 }}>+</span>«+» на середине стены добавляет угол — так делается ниша или выступ</li>
          <li style={{ display: 'flex', gap: sp(10) }}><span aria-hidden="true" style={{ flex: 'none', width: 16, textAlign: 'center', fontWeight: 700 }}>⌫</span>Чтобы убрать угол, выделите его и нажмите Delete</li>
        </ul>
      </div>
    </section>
  );
}

function Toggle<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', height: H.lg, boxSizing: 'border-box', border: `1px solid ${C.borderStrong}`, borderRadius: R.md, overflow: 'hidden' }}>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={v === value} onClick={() => onChange(v)} style={{ flex: 1, border: 0, padding: sp(0, 12), background: v === value ? C.text : C.surface, color: v === value ? C.onAccent : C.text, ...fs(13), fontWeight: v === value ? 700 : 500 }}>
          {text}
        </button>
      ))}
    </div>
  );
}

export function DoorCard() {
  const { state, dispatch } = useRoom();
  const frames = wallFrames(state.room.vertices);
  const door = state.room.openings.find((o) => o.kind === 'door');
  const set = (patch: Partial<Opening>) => {
    const d = { wall: 0, offset: 20, width: 80, swing: 'in-right' as const, ...door, ...patch };
    dispatch({ type: 'SET_DOOR', wall: d.wall, offset: d.offset, width: d.width, swing: d.swing });
  };
  const inward = !door?.swing || door.swing.startsWith('in');
  const left = door?.swing?.endsWith('left') ?? false;
  const field: CSSProperties = { width: '100%', height: H.lg, boxSizing: 'border-box', padding: sp(0, 36, 0, 14), border: `1px solid ${C.borderStrong}`, borderRadius: R.md, background: C.surface, ...fs(14), color: C.text };
  const label: CSSProperties = { display: 'flex', flexDirection: 'column', gap: sp(6), ...fs(12), fontWeight: 600, color: C.text2 };
  const metres = (cm: number) => String(Math.round(cm) / 100).replace('.', ',');
  const parseM = (s: string) => Number(s.replace(',', '.')) * 100;
  return (
    <section style={{ ...card, marginTop: sp(20), padding: sp(20) }} aria-labelledby="h-door">
      <h2 id="h-door" style={{ margin: 0, fontFamily: FONT.display, fontWeight: 500, ...fs(22) }}>Дверь</h2>
      {!door ? (
        <button type="button" onClick={() => set({})} style={{ marginTop: sp(12), height: H.lg, padding: sp(0, 14), border: `1px solid ${C.borderStrong}`, borderRadius: R.md, background: C.surface, ...fs(14), fontWeight: 600, color: C.text }}>Добавить дверь</button>
      ) : (
        <>
          <label style={{ ...label, marginTop: sp(12) }}>Стена
            <span style={{ position: 'relative' }}>
              <select value={door.wall} onChange={(e) => set({ wall: Number(e.target.value) })} style={{ ...selectStyle, width: '100%' }}>
                {frames.map((f, i) => <option key={i} value={i} disabled={f.len < 50}>Стена {i + 1} · {num(f.len / 100)} м</option>)}
              </select>
              <Chevron />
            </span>
          </label>
          <div style={{ marginTop: sp(12), display: 'grid', gridTemplateColumns: '1fr 1fr', gap: sp(12) }}>
            <label style={label}>Отступ от угла
              <span style={{ position: 'relative' }}>
                <input key={`o${door.wall}${door.offset}`} inputMode="decimal" defaultValue={metres(door.offset)} onBlur={(e) => set({ offset: parseM(e.target.value) })} style={field} />
                <span style={{ position: 'absolute', right: 14, top: 10, ...fs(13), color: C.text2 }}>м</span>
              </span>
            </label>
            <label style={label}>Ширина
              <span style={{ position: 'relative' }}>
                <input key={`w${door.width}`} inputMode="decimal" defaultValue={metres(door.width)} onBlur={(e) => set({ width: parseM(e.target.value) })} style={field} />
                <span style={{ position: 'absolute', right: 14, top: 10, ...fs(13), color: C.text2 }}>м</span>
              </span>
            </label>
          </div>
          <p style={{ margin: sp(12, 0, 6), ...fs(12), fontWeight: 600, color: C.text2 }}>Открывание</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: sp(12) }}>
            <Toggle label="Куда открывается" value={inward ? 'in' : 'out'} options={[['in', 'внутрь'], ['out', 'наружу']]} onChange={(v) => set({ swing: `${v}-${left ? 'left' : 'right'}` as Opening['swing'] })} />
            <Toggle label="Где петли" value={left ? 'left' : 'right'} options={[['left', 'влево'], ['right', 'вправо']]} onChange={(v) => set({ swing: `${inward ? 'in' : 'out'}-${v}` as Opening['swing'] })} />
          </div>
        </>
      )}
    </section>
  );
}
