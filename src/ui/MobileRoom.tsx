// Phone layout (artboards C-Mobile and C-Mobile-Plan, 390 × 844).

import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { C, FONT, fs, sp, R, H, LS, SH, button, selectStyle } from './ds';
import { AnchorIcon, Chevron, ChevronRight, FallArrow, LegendAnchored, LegendFalls, LegendSlides, Logo, MenuIcon, PlusBig, RotateIcon, Shake, TrashIcon } from './icons';
import { FloorStepper, IntensityScale, floorNumbers, BUILDING } from './controls';
import { PlanView } from './PlanView';
import { Summary } from './Summary';
import { CustomItemForm } from './CustomItemForm';
import { num, onFloor, points, plural, countPhrase } from './format';
import { status, tag, summaryCounts } from './verdict';
import { useRoom, type RoomAssessment } from '../state/RoomContext';
import { useQuake, poseAt, floorAt, type Pose } from '../three/useQuake';
import { criticalIntensity } from '../physics/assess';
import { intensityToAccel } from '../physics/intensity';
import { RECORDS } from '../data/records';
import { PANEL_BEDROOM } from '../data/presets';
import type { BuildingType, FurnitureKind, Item } from '../physics/types';
import type { Route } from './Header';

const Scene3D = lazy(() => import('../three/Scene3D'));
const TONE = { falls: C.danger, slides: C.slide, safe: C.safe, stands: C.text2 } as const;

function useWidth(): number {
  const [w, setW] = useState(() => Math.min(window.innerWidth, 900));
  useEffect(() => {
    const on = () => setW(Math.min(window.innerWidth, 900));
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}

/** The selected item, or the most dangerous one when nothing is selected (as the design shows). */
function useFocus(result: RoomAssessment): { item?: Item; chosen: boolean } {
  const { state } = useRoom();
  const chosen = state.selectedId ? state.room.items.find((i) => i.id === state.selectedId) : undefined;
  if (chosen) return { item: chosen, chosen: true };
  const first = result.checklist.map((a) => state.room.items.find((i) => i.id === a.itemId)!).find((i) => i && i.kind !== 'bed');
  return { item: first, chosen: false };
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span style={{ marginLeft: 'auto', alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: sp(4), height: H.xs, boxSizing: 'border-box', padding: sp(0, 8), border: `1px solid ${tone}`, borderRadius: R.sm, background: C.surface, ...fs(12), fontWeight: 700, color: tone, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

export function MobileHeader({ route }: { route: Route }) {
  const [open, setOpen] = useState(false);
  const { state, dispatch } = useRoom();
  const field: CSSProperties = { display: 'flex', flexDirection: 'column', gap: sp(4), ...fs(12), fontWeight: 600, color: C.text2 };
  return (
    <>
      <header style={{ height: 56, flex: 'none', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: sp(10), padding: sp(0, 6, 0, 16), borderBottom: `1px solid ${C.border}`, background: C.bg }}>
        <Logo />
        <a href="#room" style={{ display: 'flex', flexDirection: 'column', color: C.text }}>
          <span style={{ fontFamily: FONT.display, fontWeight: 600, ...fs(18) }}>[Название]</span>
          <span style={{ ...fs(12), color: C.text2 }}>проверка спальни на землетрясение</span>
        </a>
        <button type="button" aria-label="Меню" aria-expanded={open} onClick={() => setOpen((v) => !v)} style={{ marginLeft: 'auto', width: 44, height: 44, padding: 0, border: 0, borderRadius: R.md, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MenuIcon />
        </button>
      </header>
      {open && (
        <nav aria-label="Меню" style={{ position: 'absolute', top: 56, left: 0, right: 0, zIndex: 20, padding: sp(12, 16, 16), background: C.surface, borderBottom: `1px solid ${C.border}`, boxShadow: SH[3], display: 'flex', flexDirection: 'column', gap: sp(12) }}>
          {([['room', 'Комната'], ['method', 'Как посчитано'], ['physics', 'Проверка физики']] as const).map(([r, label]) => (
            <a key={r} href={`#${r}`} onClick={() => setOpen(false)} aria-current={route === r ? 'page' : undefined} style={{ ...fs(16), fontWeight: route === r ? 700 : 500, color: route === r ? C.text : C.text2, height: H.xl, display: 'flex', alignItems: 'center' }}>
              {label}
            </a>
          ))}
          <label style={field}>
            Запись землетрясения
            <span style={{ position: 'relative' }}>
              <select value={state.settings.recordId} onChange={(e) => dispatch({ type: 'SET_RECORD', id: e.target.value })} style={{ ...selectStyle, width: '100%', height: H.xl }}>
                {RECORDS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <Chevron />
            </span>
          </label>
          <label style={field}>
            Тип дома
            <span style={{ position: 'relative' }}>
              <select value={state.settings.buildingType} onChange={(e) => dispatch({ type: 'SET_BUILDING_TYPE', value: e.target.value as BuildingType })} style={{ ...selectStyle, width: '100%', height: H.xl }}>
                {BUILDING.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
              <Chevron />
            </span>
          </label>
          <label style={field}>
            Город
            <span style={{ position: 'relative' }}>
              <select defaultValue="almaty" style={{ ...selectStyle, width: '100%', height: H.xl }}>
                <option value="almaty">Алматы</option>
              </select>
              <Chevron />
            </span>
          </label>
        </nav>
      )}
    </>
  );
}

function ViewToggle({ view, onChange, dark = false }: { view: '3d' | 'plan'; onChange: (v: '3d' | 'plan') => void; dark?: boolean }) {
  return (
    <div role="group" aria-label="Вид" style={dark
      ? { display: 'flex', gap: sp(2), height: H.md, boxSizing: 'border-box', padding: sp(2), border: `1px solid ${C.borderStrong}`, borderRadius: R.md, background: C.surface }
      : { display: 'flex', height: H.lg, boxSizing: 'border-box', padding: sp(2), border: `1px solid ${C.border}`, borderRadius: R.md, background: C.bg }}>
      {(['3d', 'plan'] as const).map((v) => {
        const on = v === view;
        const style: CSSProperties = dark
          ? { height: 26, padding: sp(0, 14), border: 0, borderRadius: R.sm, background: on ? C.text : 'transparent', ...fs(13), fontWeight: on ? 600 : 500, color: on ? C.onAccent : C.text2 }
          : { height: '100%', padding: sp(0, 14), border: 0, borderRadius: R.md, background: on ? C.surface : 'transparent', boxShadow: on ? SH[1] : 'none', ...fs(13), fontWeight: on ? 700 : 500, color: on ? C.text : C.text2 };
        return <button key={v} type="button" aria-pressed={on} onClick={() => onChange(v)} style={style}>{v === '3d' ? '3D' : 'План'}</button>;
      })}
    </div>
  );
}

export function MobileRoom({ result }: { result: RoomAssessment }) {
  const [view, setView] = useState<'3d' | 'plan'>('3d');
  return view === '3d' ? <Mobile3D result={result} onView={setView} /> : <MobilePlan result={result} onView={setView} />;
}

function Mobile3D({ result, onView }: { result: RoomAssessment; onView: (v: '3d' | 'plan') => void }) {
  const { state, dispatch } = useRoom();
  const { settings, room } = state;
  const width = useWidth();
  const quake = useQuake(room, settings, result.checklist);
  const q = quake.state;
  const playback = q.phase === 'playing' || q.phase === 'done' ? q : null;
  const poses = useMemo(() => {
    if (!playback) return null;
    const m = new Map<string, Pose>();
    for (const [id] of playback.result.poses) { const p = poseAt(playback.result, id, playback.t); if (p) m.set(id, p); }
    return m;
  }, [playback]);
  const { gain, pfa7 } = floorNumbers(result, settings.intensity);
  const focus = useFocus(result);
  const counts = summaryCounts(result.checklist.filter((a) => room.items.find((i) => i.id === a.itemId)?.kind !== 'bed'));
  const atPoints = Number.isInteger(settings.intensity) ? `${settings.intensity} ${plural(settings.intensity, ['балле', 'баллах', 'баллах'])}` : `${num(settings.intensity)} балла`;

  return (
    <>
      <section aria-label="3D-сцена комнаты" style={{ flex: 'none', background: C.surface }}>
        <div style={{ position: 'relative', height: 336 }}>
          <Suspense fallback={<p style={{ margin: 0, padding: sp(48, 16), ...fs(14), color: C.text2 }}>Загружаем 3D…</p>}>
            <Scene3D room={room} byId={result.byId} selectedId={state.selectedId} dispatch={dispatch} preset="overview" poses={poses} floorOffset={playback ? floorAt(playback.result, playback.t) : undefined} width={width} height={336} />
          </Suspense>
          <div style={{ position: 'absolute', left: 16, top: 12 }}><ViewToggle view="3d" onChange={onView} /></div>
          <ul aria-label="Легенда" style={{ position: 'absolute', left: 16, bottom: 10, listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: sp(2), ...fs(12), color: C.text }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: sp(6) }}><LegendFalls />упадёт</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: sp(6) }}><LegendSlides />сдвинется</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: sp(6) }}><LegendAnchored />закреплён</li>
          </ul>
          {q.phase === 'computing' && (
            <p role="status" style={{ position: 'absolute', right: 16, bottom: 10, margin: 0, padding: sp(6, 10), borderRadius: R.md, background: C.surface, boxShadow: SH[2], ...fs(12), color: C.text }}>Считаем…</p>
          )}
          {playback?.phase === 'done' && (
            <p role="status" style={{ position: 'absolute', right: 16, bottom: 10, margin: 0, padding: sp(6, 10), borderRadius: R.md, background: C.surface, boxShadow: SH[2], ...fs(12), color: C.text }}>
              Упало {playback.result.outcomes.filter((o) => o.result === 'fell').length}, по формуле — {counts.falls}
            </p>
          )}
        </div>
        <div style={{ height: 52, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: sp(8), padding: sp(0, 16, 6), borderBottom: `1px solid ${C.border}` }}>
          <button type="button" onClick={quake.shake} disabled={q.phase === 'computing' || pfa7 === null} style={{ ...button.primary, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: sp(8), padding: sp(0, 12) }}>
            <Shake />Тряхнуть · {points(settings.intensity)}
          </button>
          {playback && <button type="button" onClick={() => quake.replay(0.5)} style={button.secondary}>×0,5</button>}
          <button type="button" onClick={quake.reset} style={button.secondary}>Сбросить</button>
        </div>
      </section>

      <section aria-label="Сила толчка и этаж" style={{ flex: 'none', height: 154, boxSizing: 'border-box', padding: sp(10, 16, 6) }}>
        <div style={{ height: 48, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="m-shake" style={{ ...fs(12), fontWeight: 600, color: C.text2 }}>Сила толчка</label>
            <span style={{ fontFamily: FONT.display, fontWeight: 500, ...fs(26), letterSpacing: LS.display }}>
              {num(settings.intensity)} <span style={{ ...fs(16), letterSpacing: 0 }}>{points(settings.intensity).split(' ')[1]}</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: sp(6) }}>
            <label htmlFor="m-floor" style={{ ...fs(12), fontWeight: 600, color: C.text2 }}>Этаж</label>
            <FloorStepper id="m-floor" compact gain={gain} />
          </div>
        </div>
        <IntensityScale id="m-shake" compact result={result} />
      </section>

      {focus.item && <MobileItemCard item={focus.item} result={result} />}

      <div style={{ flex: 1, minHeight: sp(12) }} />
      <a href="#summary" aria-label={`Итог ${atPoints}. Открыть список дел`} style={{ position: 'sticky', bottom: 0, flex: 'none', height: 56, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: sp(10), padding: sp(0, 16), background: C.surface, borderTop: `1px solid ${C.border}`, color: C.text, zIndex: 5 }}>
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ ...fs(12), fontWeight: 600, color: C.text2 }}>Итог при {atPoints}</span>
          <span style={{ ...fs(14), fontWeight: 700 }}>
            {result.peak.status !== 'ready' ? 'Считаем…' : [
              counts.falls > 0 && <span key="f" style={{ color: C.danger }}>{countPhrase(counts.falls, 'falls').replace(/ предмет\S*/, '')}</span>,
              counts.slides > 0 && <span key="s" style={{ color: C.slide }}>{countPhrase(counts.slides, 'slides')}</span>,
              counts.safe > 0 && <span key="a" style={{ color: C.safe }}>{countPhrase(counts.safe, 'anchored')}</span>,
            ].filter(Boolean).flatMap((p, k) => (k ? [<span key={`d${k}`} style={{ color: C.text2, fontWeight: 500 }}> · </span>, p] : [p]))}
          </span>
        </span>
        <ChevronRight />
      </a>
      <div style={{ padding: sp(0, 16, 24), background: C.bg }}>
        <Summary result={result} />
      </div>
    </>
  );
}

function MobileItemCard({ item, result }: { item: Item; result: RoomAssessment }) {
  const { state, dispatch } = useRoom();
  const a = result.byId.get(item.id);
  const st = a ? status(a) : 'stands';
  const at1 = a?.thresholdG != null && !a.cascadeFrom ? criticalIntensity(a.thresholdG, intensityToAccel(7)) : null;
  return (
    <section aria-labelledby="m-item" style={{ flex: 'none', margin: sp(0, 16), padding: sp(12, 16), background: C.surface, border: `1px solid ${C.border}`, borderRadius: R.lg, boxShadow: SH[1] }}>
      <div style={{ height: 28, display: 'flex', alignItems: 'baseline', gap: sp(8) }}>
        <h2 id="m-item" style={{ margin: 0, fontFamily: FONT.display, fontWeight: 600, ...fs(22) }}>{item.name}</h2>
        <span style={{ ...fs(13), color: C.text2, whiteSpace: 'nowrap' }}>{item.w} × {item.d} × {item.height} см</span>
        {a && item.kind !== 'bed' && <Badge tone={TONE[st]}>{st === 'falls' && <FallArrow />}{capital(tag(item, a))}</Badge>}
      </div>
      {a && a.criticalIntensity !== null && st !== 'safe' ? (
        <>
          <p style={{ margin: sp(6, 0, 0), height: 32, display: 'flex', alignItems: 'baseline', gap: sp(6), fontFamily: FONT.display, fontWeight: 500, color: TONE[st] }}>
            <span style={{ ...fs(26), letterSpacing: LS.number }}>{a.criticalIntensity > 10 ? '>10' : `≈${num(a.criticalIntensity)}`}</span>
            <span style={{ ...fs(16) }}>{points(Math.min(a.criticalIntensity, 10)).split(' ')[1]}</span>
          </p>
          <p style={{ margin: sp(2, 0, 0), ...fs(13), fontWeight: 600, color: C.text }}>{a.mode === 'wallFalls' ? 'сорвётся' : 'упадёт'} при такой силе толчка {onFloor(state.settings.floor)}</p>
          {at1 !== null && state.settings.floor !== 1 && <p style={{ margin: sp(2, 0, 0), ...fs(12), color: C.text2 }}>на 1-м этаже — при {at1 > 10 ? 'более 10' : num(at1)}</p>}
        </>
      ) : a ? (
        <p style={{ margin: sp(6, 0, 0), ...fs(13), fontWeight: 600, color: TONE[st] }}>
          {st === 'safe' ? 'Закреплено — не опрокинется, если крепёж в несущей стене.' : st === 'slides' ? 'Скорее сдвинется по полу, чем упадёт.' : 'Не опрокинется: стены со всех сторон.'}
        </p>
      ) : null}
      {item.kind !== 'bed' && item.mount.kind !== 'wall' && (
        item.anchored
          ? <button type="button" onClick={() => dispatch({ type: 'TOGGLE_ANCHOR', id: item.id })} style={{ ...button.secondary, marginTop: sp(10), width: '100%', height: H.xl, ...fs(16) }}>Открепить</button>
          : (
            <button type="button" onClick={() => dispatch({ type: 'TOGGLE_ANCHOR', id: item.id })} style={{ ...button.primary, marginTop: sp(10), width: '100%', height: H.xl, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: sp(8), ...fs(16) }}>
              <AnchorIcon />Закрепить к стене
            </button>
          )
      )}
    </section>
  );
}

const ADD: { label: string; productKey?: string; kind: FurnitureKind }[] = [
  { label: 'Шкаф', productKey: 'ikea-pax-236', kind: 'wardrobe' },
  { label: 'Стеллаж', productKey: 'ikea-billy', kind: 'bookshelf' },
  { label: 'Комод', productKey: 'ikea-malm-4', kind: 'dresser' },
  { label: 'Зеркало', productKey: 'ikea-ikornnes', kind: 'mirror' },
  { label: 'Холодильник', kind: 'fridge' },
  { label: 'Свой размер…', kind: 'wardrobe' },
];

function MobilePlan({ result, onView }: { result: RoomAssessment; onView: (v: '3d' | 'plan') => void }) {
  const { state, dispatch } = useRoom();
  const width = useWidth();
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState<FurnitureKind | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const focus = useFocus(result);
  const item = focus.item;
  const a = item && result.byId.get(item.id);
  const st = a ? status(a) : 'stands';
  const angle = item ? ((Math.round(item.angle) % 360) + 360) % 360 : 0;
  const secondary: CSSProperties = { ...button.secondary, flex: 1, height: H.xl, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: sp(8), padding: sp(0, 16) };

  return (
    <>
      <div style={{ height: 52, flex: 'none', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: sp(12), padding: sp(0, 16), borderBottom: `1px solid ${C.border}` }}>
        <ViewToggle view="plan" onChange={onView} dark />
        <p style={{ margin: 0, ...fs(12), color: C.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{state.room.id === PANEL_BEDROOM.id ? PANEL_BEDROOM.name : 'Своя планировка'}</p>
      </div>
      <main aria-label="План комнаты" style={{ position: 'relative', flex: 1, minHeight: 560, overflow: 'hidden', background: C.surface }}>
        <PlanView room={state.room} byId={result.byId} selectedId={state.selectedId} dispatch={dispatch} width={width} height={400} fit="fill" labelSize={15} />
        <ul aria-label="Легенда" style={{ position: 'absolute', left: 16, top: 408, listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: sp(16), ...fs(12), color: C.text }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: sp(6) }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: R.full, background: C.danger }} />зона падения</li>
          <li style={{ display: 'flex', alignItems: 'center', gap: sp(6) }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: R.full, background: C.safe }} />проход</li>
        </ul>
        <button type="button" aria-label="Добавить предмет" aria-expanded={adding} onClick={() => setAdding((v) => !v)} style={{ position: 'absolute', right: 16, top: 396, height: H.xl, display: 'flex', alignItems: 'center', gap: sp(8), padding: sp(0, 16), border: `1px solid ${C.borderStrong}`, borderRadius: R.md, boxShadow: SH[2], background: C.surface, ...fs(14), fontWeight: 600, color: C.text }}>
          <PlusBig />Добавить
        </button>

        {(adding || custom) && (
          <section aria-label="Добавить предмет" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 3, padding: sp(12, 16, 16), background: C.surface, border: `1px solid ${C.border}`, borderBottom: 0, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, boxShadow: SH[3] }}>
            {custom ? (
              <CustomItemForm kind={custom} onClose={() => { setCustom(null); setAdding(false); }} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: sp(8) }}>
                {ADD.map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() => {
                      if (b.productKey) { dispatch({ type: 'ADD_ITEM', productKey: b.productKey }); setAdding(false); } else setCustom(b.kind);
                    }}
                    style={{ ...button.secondary, height: H.xl }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {item && !adding && !custom && (
          <section aria-labelledby="sheet-title" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2, boxSizing: 'border-box', padding: sp(0, 16, 16), background: C.surface, border: `1px solid ${C.border}`, borderBottom: 0, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, boxShadow: SH[3] }}>
            <button type="button" aria-label={collapsed ? 'Развернуть панель' : 'Свернуть панель'} aria-expanded={!collapsed} onClick={() => setCollapsed((v) => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 88, height: 20, margin: '0 auto', padding: 0, border: 0, background: 'transparent' }}>
              <span style={{ display: 'block', width: 36, height: 4, borderRadius: R.xs, background: C.borderStrong }} />
            </button>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: sp(8), height: 28 }}>
              <h2 id="sheet-title" style={{ margin: 0, fontFamily: FONT.display, fontWeight: 600, ...fs(22) }}>{item.name}</h2>
              <span style={{ ...fs(13), color: C.text2, whiteSpace: 'nowrap' }}>{item.w} × {item.d} × {item.height} см</span>
              {a && item.kind !== 'bed' && <Badge tone={TONE[st]}>{st === 'falls' && <FallArrow />}{capital(tag(item, a))}</Badge>}
            </div>
            {!collapsed && (
              <>
                {item.mount.kind !== 'wall' && (
                  <>
                    <div style={{ marginTop: sp(16), display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', height: 28 }}>
                      <label htmlFor="p-angle" style={{ ...fs(12), fontWeight: 600, color: C.text2 }}>Угол поворота</label>
                      <output htmlFor="p-angle" style={{ fontFamily: FONT.display, fontWeight: 500, ...fs(22), letterSpacing: LS.display, color: C.text }}>{angle}°</output>
                    </div>
                    <div style={{ position: 'relative', height: 44 }}>
                      <div aria-hidden="true" style={{ position: 'absolute', left: 9, right: 9, top: 20, height: 4, borderRadius: R.xs, background: C.border }}>
                        <div style={{ width: `${(angle / 359) * 100}%`, height: 4, borderRadius: R.xs, background: C.poche }} />
                      </div>
                      <input id="p-angle" className="rng" type="range" min={0} max={359} step={1} value={angle} aria-valuetext={`${angle} градусов`} onChange={(e) => dispatch({ type: 'SET_ANGLE', id: item.id, angle: Number(e.target.value) })} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 44 }} />
                    </div>
                    <div aria-hidden="true" style={{ position: 'relative', height: 16, marginTop: -8, pointerEvents: 'none', ...fs(12), color: C.text2 }}>
                      <div style={{ position: 'absolute', left: 9, right: 9, top: 0, height: 16 }}>
                        {[0, 90, 180, 270, 359].map((d) => (
                          <span key={d} style={{ position: 'absolute', left: `${(d / 359) * 100}%`, transform: 'translateX(-50%)', ...(Math.abs(d - angle) < 1 ? { color: C.text, fontWeight: 700 } : {}) }}>{d}°</span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {item.kind !== 'bed' && item.mount.kind !== 'wall' && (
                  item.anchored
                    ? <button type="button" onClick={() => dispatch({ type: 'TOGGLE_ANCHOR', id: item.id })} style={{ ...button.secondary, marginTop: sp(16), width: '100%', height: H.xl, ...fs(16) }}>Открепить</button>
                    : (
                      <button type="button" onClick={() => dispatch({ type: 'TOGGLE_ANCHOR', id: item.id })} style={{ ...button.primary, marginTop: sp(16), width: '100%', height: H.xl, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: sp(8), ...fs(16) }}>
                        <AnchorIcon />Закрепить к стене
                      </button>
                    )
                )}
                <div style={{ marginTop: sp(8), display: 'flex', gap: sp(8) }}>
                  {item.mount.kind !== 'wall' && <button type="button" onClick={() => dispatch({ type: 'SET_ANGLE', id: item.id, angle: item.angle + 90 })} style={secondary}><RotateIcon />Повернуть 90°</button>}
                  <button type="button" onClick={() => dispatch({ type: 'DELETE_ITEM', id: item.id })} style={secondary}><TrashIcon />Удалить</button>
                </div>
              </>
            )}
          </section>
        )}
      </main>
      {state.notice && <p role="status" style={{ margin: 0, padding: sp(8, 16), ...fs(13), color: C.text2 }}>{state.notice}</p>}
    </>
  );
}


