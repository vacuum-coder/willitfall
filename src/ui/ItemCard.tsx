// Right column, top (C-Desktop «Выбранный предмет»): the engine's verdict for one item and its actions.

import { useState, type CSSProperties, type ReactNode } from 'react';
import { C, FONT, fs, sp, R, H, LS, card, button } from './ds';
import { FallArrow } from './icons';
import { num, onFloor, points } from './format';
import { status, tag } from './verdict';
import { useRoom, type RoomAssessment } from '../state/RoomContext';
import { criticalIntensity, supportTop, WALL_THROW } from '../physics/assess';
import { tiltAngleDeg, type Filling } from '../physics/tipping';
import { intensityToAccel } from '../physics/intensity';
import { product } from '../data/furniture';
import type { Fastening, Item, ItemAssessment } from '../physics/types';

const TONE = { falls: C.danger, slides: C.slide, safe: C.safe, stands: C.text2 } as const;

const FILLINGS: { value: Filling; label: string }[] = [
  { value: 'bottom', label: 'тяжёлое внизу' },
  { value: 'even', label: 'равномерно' },
  { value: 'top', label: 'тяжёлое наверху' },
];
const FASTENINGS: { value: Fastening; label: string }[] = [
  { value: 'anchor', label: 'анкер в несущую' },
  { value: 'weak', label: 'дюбель, гвоздь' },
  { value: 'unknown', label: 'не знаю' },
];

const dt: CSSProperties = { padding: sp(4, 0), borderTop: `1px solid ${C.border}`, color: C.text2 };
const dd: CSSProperties = { margin: 0, padding: sp(4, 0), borderTop: `1px solid ${C.border}`, fontWeight: 700, textAlign: 'right' };

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', height: H.md, boxSizing: 'border-box', padding: sp(2), border: `1px solid ${C.border}`, borderRadius: R.md, background: C.bg }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            style={{
              flex: 1, height: '100%', padding: sp(0, 6), border: 0, borderRadius: R.md, whiteSpace: 'nowrap',
              background: on ? C.surface : 'transparent', boxShadow: on ? 'var(--sh-1)' : 'none',
              ...fs(12), fontWeight: on ? 700 : 500, color: on ? C.text : C.text2,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function direction(a: ItemAssessment): string {
  if (a.hitsPillow || a.hitsBed) return 'к кровати';
  if (a.blocksDoor) return 'к двери';
  const s = a.sides[0];
  return s === 'front' ? 'вперёд' : s === 'back' ? 'назад' : s ? 'вбок' : '—';
}

export function ItemCard({ result }: { result: RoomAssessment }) {
  const { state, dispatch } = useRoom();
  const [editing, setEditing] = useState(false);
  const chosen = state.selectedId ? state.room.items.find((i) => i.id === state.selectedId) : undefined;
  const fallback = !chosen && result.checklist.map((a) => state.room.items.find((i) => i.id === a.itemId)!).find((i) => i.kind !== 'bed');
  const item = chosen ?? fallback;
  if (!item) {
    return (
      <section style={{ ...card, padding: sp(20) }}>
        <p style={{ margin: 0, ...fs(14), color: C.text2 }}>Нажмите на предмет на плане или в 3D — здесь появится, при какой силе толчка он упадёт.</p>
      </section>
    );
  }
  const a = result.byId.get(item.id);
  const st = a ? status(a) : 'stands';
  const pfa7 = result.peak.status === 'ready' ? result.peak.pfa7G : null;

  return (
    <section aria-labelledby="h-item" style={{ ...card, padding: sp(20) }}>
      <p style={{ margin: 0, ...fs(12), fontWeight: 600, color: C.text2 }}>{chosen ? 'Выбранный предмет' : 'Самый опасный предмет'}</p>
      <div style={{ marginTop: sp(4), display: 'flex', alignItems: 'baseline', gap: sp(10), height: 32 }}>
        <h2 id="h-item" style={{ margin: 0, fontFamily: FONT.display, fontWeight: 600, ...fs(26) }}>{item.name}</h2>
        <button type="button" onClick={() => setEditing((v) => !v)} aria-expanded={editing} title="Изменить размеры" style={{ padding: 0, border: 0, background: 'transparent', ...fs(13), color: C.text2, textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>
          {item.w} × {item.d} × {item.height} см
        </button>
        {a && item.kind !== 'bed' && <Badge tone={TONE[st]}>{st === 'falls' && <FallArrow />}{capital(tag(item, a))}</Badge>}
      </div>
      {editing && <SizeEditor item={item} />}
      {item.productKey && (
        <p style={{ margin: sp(4, 0, 0), ...fs(12), color: C.text2 }}>
          Размеры: <a href={product(item.productKey).url} target="_blank" rel="noreferrer" style={{ color: C.text2, textDecoration: 'underline' }}>{product(item.productKey).name}</a>
        </p>
      )}

      {item.kind !== 'bed' && a && <Verdict item={item} a={a} pfa7={pfa7} floor={state.settings.floor} />}

      {item.kind !== 'bed' && a && (
        <dl style={{ margin: sp(14, 0, 0), display: 'grid', gridTemplateColumns: '1fr auto', ...fs(14) }}>
          <dt style={dt}>{item.mount.kind === 'wall' ? 'Порог срыва' : 'Порог опрокидывания'}</dt>
          <dd style={dd}>{a.thresholdG === null ? '—' : `${num(a.thresholdG, 2)} g`}</dd>
          {item.mount.kind !== 'wall' && (
            <>
              <dt style={dt}>Угол опрокидывания</dt>
              <dd style={dd}>{a.sides[0] ? `${num(tiltAngleDeg(a.sides[0] === 'left' || a.sides[0] === 'right' ? item.w : item.d, item.height, item.filling ?? 'even'))}°` : '—'}</dd>
            </>
          )}
          <dt style={dt}>Длина зоны падения</dt>
          <dd style={dd}>{a.zones.length ? `${num(zoneLength(item, state.room.items) / 100)} м` : '—'}</dd>
          <dt style={{ ...dt, borderBottom: `1px solid ${C.border}` }}>Направление</dt>
          <dd style={{ ...dd, borderBottom: `1px solid ${C.border}` }}>{a.zones.length ? direction(a) : '—'}</dd>
        </dl>
      )}

      {item.kind !== 'bed' && item.mount.kind !== 'wall' && (
        <div style={{ marginTop: sp(12) }}>
          <p style={{ margin: sp(0, 0, 6), ...fs(12), fontWeight: 600, color: C.text2 }}>Как заполнен?</p>
          <Segmented label="Как заполнен" value={item.filling ?? 'even'} options={FILLINGS} onChange={(v) => dispatch({ type: 'SET_FILLING', id: item.id, filling: v })} />
        </div>
      )}
      {item.mount.kind === 'wall' && (
        <div style={{ marginTop: sp(12) }}>
          <p style={{ margin: sp(0, 0, 6), ...fs(12), fontWeight: 600, color: C.text2 }}>Чем прикреплён · оценка по типу крепления</p>
          <Segmented label="Крепление" value={item.mount.fastening} options={FASTENINGS} onChange={(v) => dispatch({ type: 'SET_FASTENING', id: item.id, fastening: v })} />
        </div>
      )}
      {item.kind === 'bed' && (
        <div style={{ marginTop: sp(12) }}>
          <p style={{ margin: sp(0, 0, 6), ...fs(12), fontWeight: 600, color: C.text2 }}>Где подушка</p>
          <Segmented
            label="Сторона изголовья"
            value={item.headSide ?? 'back'}
            options={[{ value: 'back', label: 'сзади' }, { value: 'front', label: 'спереди' }, { value: 'left', label: 'слева' }, { value: 'right', label: 'справа' }]}
            onChange={(v) => dispatch({ type: 'SET_BED_HEAD', id: item.id, side: v })}
          />
        </div>
      )}

      <div style={{ marginTop: sp(16), display: 'flex', flexWrap: 'wrap', gap: sp(8) }}>
        {item.kind !== 'bed' && item.mount.kind !== 'wall' && (
          item.anchored
            ? <button type="button" onClick={() => dispatch({ type: 'TOGGLE_ANCHOR', id: item.id })} style={{ ...button.secondary, flex: 1, padding: sp(0, 10) }}>Открепить</button>
            : <button type="button" onClick={() => dispatch({ type: 'TOGGLE_ANCHOR', id: item.id })} style={{ ...button.primary, flex: 1, padding: sp(0, 10) }}>Закрепить к стене</button>
        )}
        {item.mount.kind !== 'wall' && (
          <button type="button" onClick={() => dispatch({ type: 'SET_ANGLE', id: item.id, angle: item.angle + 15 })} style={{ ...button.secondary, padding: sp(0, 10), ...(item.kind === 'bed' ? { flex: 1 } : {}) }}>Повернуть</button>
        )}
        <button type="button" onClick={() => dispatch({ type: 'DELETE_ITEM', id: item.id })} style={{ ...button.secondary, padding: sp(0, 10), ...(item.mount.kind === 'wall' ? { flex: 1 } : {}) }}>Удалить</button>
      </div>
    </section>
  );
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span style={{ marginLeft: 'auto', alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: sp(4), height: H.xs, boxSizing: 'border-box', padding: sp(0, 8), border: `1px solid ${tone}`, borderRadius: R.sm, ...fs(12), fontWeight: 700, color: tone, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function Verdict({ item, a, pfa7, floor }: { item: Item; a: ItemAssessment; pfa7: number | null; floor: number }) {
  const st = status(a);
  const big: CSSProperties = { margin: 0, display: 'flex', alignItems: 'baseline', gap: sp(8), fontFamily: FONT.display, fontWeight: 500, color: TONE[st] };
  const sub: CSSProperties = { margin: sp(4, 0, 0), ...fs(14), fontWeight: 600, color: C.text };
  const note: CSSProperties = { margin: sp(2, 0, 0), ...fs(13), color: C.text2 };
  let body: ReactNode;
  if (a.mode === 'anchored' || a.mode === 'wallSafe') {
    body = (<><p style={big}><span style={{ ...fs(26) }}>{capital(tag(item, a))}</span></p><p style={sub}>не опрокинется</p><p style={note}>Верно, если крепёж вкручен в несущую стену по инструкции.</p></>);
  } else if (a.mode === 'blocked' && a.criticalIntensity === null) {
    body = (<><p style={big}><span style={{ ...fs(26) }}>Не опрокинется</span></p><p style={note}>Со всех сторон стены ближе 5 см.</p></>);
  } else if (a.mode === 'slides' && a.criticalIntensity === null) {
    body = (<><p style={big}><span style={{ ...fs(26) }}>Сдвинется</span></p><p style={sub}>скорее поедет по полу, чем упадёт</p><p style={note}>Трение 0,4 срывается раньше, чем {num(a.thresholdG ?? 0, 2)} g нужно для опрокидывания.</p></>);
  } else if (a.criticalIntensity !== null) {
    const at1 = a.thresholdG !== null && !a.cascadeFrom ? criticalIntensity(a.thresholdG, intensityToAccel(7)) : null;
    body = (
      <>
        <p style={big}>
          <span style={{ ...fs(44), letterSpacing: LS.number }}>{a.criticalIntensity > 10 ? '>10' : `≈${num(a.criticalIntensity)}`}</span>
          <span style={{ ...fs(22) }}>{points(Math.min(a.criticalIntensity, 10)).split(' ')[1]}</span>
        </p>
        <p style={sub}>{a.mode === 'wallFalls' ? 'сорвётся' : 'упадёт'} при такой силе толчка {onFloor(floor)}{a.cascadeFrom ? ' — вместе с опорой' : ''}</p>
        {at1 !== null && floor !== 1 && <p style={note}>на 1-м этаже — при {at1 > 10 ? 'более 10' : num(at1)}</p>}
        {pfa7 === null && <p style={note}>считаем колебания здания…</p>}
      </>
    );
  }
  return <div style={{ marginTop: sp(14), paddingTop: sp(12), borderTop: `1px solid ${C.border}` }}>{body}</div>;
}

function zoneLength(item: Item, items: Item[]): number {
  if (item.mount.kind === 'wall') return item.d + WALL_THROW * item.mount.mountHeight;
  return item.height + supportTop(item, { id: '', name: '', vertices: [], openings: [], items });
}

function SizeEditor({ item }: { item: Item }) {
  const { dispatch } = useRoom();
  const input = (key: 'w' | 'd' | 'height', label: string) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: sp(4), ...fs(12), fontWeight: 600, color: C.text2 }}>
      {label}
      <input
        type="number"
        min={10}
        max={key === 'height' ? 300 : 1000}
        defaultValue={item[key]}
        onBlur={(e) => dispatch({ type: 'RESIZE_ITEM', id: item.id, [key]: Number(e.target.value) })}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        style={{ width: '100%', height: H.lg, boxSizing: 'border-box', padding: sp(0, 10), border: `1px solid ${C.borderStrong}`, borderRadius: R.md, background: C.surface, ...fs(14), color: C.text }}
      />
    </label>
  );
  return (
    <div key={item.id} style={{ marginTop: sp(8), display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: sp(8) }}>
      {input('w', 'Ширина, см')}{input('d', 'Глубина, см')}{input('height', 'Высота, см')}
    </div>
  );
}
