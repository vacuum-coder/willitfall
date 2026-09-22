// Left column of C-Desktop: 1 room + plan, 2 floor, 3 shaking strength.

import { useState, type CSSProperties } from 'react';
import { C, FONT, fs, sp, R, H, LS, card, stepNumber, selectStyle } from './ds';
import { Chevron, Move, Plus, StepMinus, StepPlus, ZoneSwatch, PassageSwatch } from './icons';
import { PlanView } from './PlanView';
import { CustomItemForm } from './CustomItemForm';
import { num, onFloor, points } from './format';
import { status } from './verdict';
import { useRoom, type RoomAssessment } from '../state/RoomContext';
import { PANEL_BEDROOM } from '../data/presets';
import { CITY_DESIGN_INTENSITY } from '../data/records';
import { intensityToAccel } from '../physics/intensity';
import type { BuildingType, FurnitureKind } from '../physics/types';

const ADD: { label: string; productKey?: string; kind: FurnitureKind }[] = [
  { label: 'Шкаф', productKey: 'ikea-pax-236', kind: 'wardrobe' },
  { label: 'Стеллаж', productKey: 'ikea-billy', kind: 'bookshelf' },
  { label: 'Комод', productKey: 'ikea-malm-4', kind: 'dresser' },
  { label: 'Зеркало', productKey: 'ikea-ikornnes', kind: 'mirror' },
  { label: 'Холодильник', kind: 'fridge' },
];

const BUILDING: { value: BuildingType; label: string }[] = [
  { value: 'panel', label: 'панельный' },
  { value: 'brick', label: 'кирпичный' },
  { value: 'monolith', label: 'монолитный каркас' },
];

const sectionTitle: CSSProperties = { ...fs(16), fontWeight: 700 };
const hint: CSSProperties = { ...fs(13), color: C.text2 };
const addButton: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: sp(6), height: H.md, padding: sp(0, 6), border: `1px solid ${C.border}`,
  borderRadius: R.md, background: C.surface2, ...fs(13), fontWeight: 600, color: C.text, textAlign: 'left', whiteSpace: 'nowrap',
};

export function ControlsPanel({ result }: { result: RoomAssessment }) {
  const { state, dispatch } = useRoom();
  const { settings, room } = state;
  const [custom, setCustom] = useState<FurnitureKind | null>(null);
  const pfa7 = result.peak.status === 'ready' ? result.peak.pfa7G : null;
  const gain = pfa7 === null ? null : pfa7 / intensityToAccel(7);
  const floorAccel = pfa7 === null ? null : pfa7 * 2 ** (settings.intensity - 7);
  const isPreset = room.id === PANEL_BEDROOM.id;

  const setFloor = (floor: number, totalFloors = settings.totalFloors) => dispatch({ type: 'SET_FLOOR', floor, totalFloors });
  const pct = (I: number) => ((I - 5) / 5) * 100;

  // Items that tip inside the slider range, lowest first — their thresholds are marked on the scale.
  const flags = result.assessments
    .filter((a) => a.criticalIntensity !== null && a.criticalIntensity >= 5 && a.criticalIntensity <= 10 && status(a) !== 'safe' && a.mode !== 'slides')
    .sort((a, b) => a.criticalIntensity! - b.criticalIntensity!)
    .slice(0, 3)
    .map((a) => ({ a, item: room.items.find((i) => i.id === a.itemId)! }));

  return (
    <section aria-label="Параметры: комната, этаж, сила толчка" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: sp(10), height: 28 }}>
        <span style={stepNumber}>1</span>
        <label htmlFor="room-select" style={sectionTitle}>Комната</label>
        <span style={hint}>готовая планировка или своя</span>
      </div>
      <div style={{ position: 'relative', marginTop: sp(10) }}>
        <select
          id="room-select"
          value={isPreset ? 'preset' : 'own'}
          onChange={(e) => {
            if (e.target.value === 'preset') dispatch({ type: 'LOAD_PRESET', room: PANEL_BEDROOM });
            else location.hash = '#walls';
          }}
          style={{ ...selectStyle, width: '100%', padding: sp(0, 36, 0, 14) }}
        >
          <option value="preset">{PANEL_BEDROOM.name}</option>
          <option value="own">Своя планировка</option>
        </select>
        <Chevron right={14} />
      </div>

      <div style={{ ...card, marginTop: sp(12), padding: sp(12) }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', height: 24 }}>
          <h2 style={{ margin: 0, fontFamily: FONT.display, fontWeight: 600, ...fs(16) }}>План</h2>
          <span style={{ ...fs(12), color: C.text2 }}>вид сверху · размеры в см</span>
        </div>
        <div style={{ display: 'flex', gap: sp(8), marginTop: sp(8) }}>
          <PlanView room={room} byId={result.byId} selectedId={state.selectedId} dispatch={dispatch} />
          <div role="group" aria-label="Добавить предмет" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: sp(6), minWidth: 0 }}>
            <span style={{ ...fs(12), fontWeight: 600, color: C.text2 }}>Добавить:</span>
            {ADD.map((b) => (
              <button
                key={b.label}
                type="button"
                style={addButton}
                onClick={() => (b.productKey ? dispatch({ type: 'ADD_ITEM', productKey: b.productKey }) : setCustom(b.kind))}
              >
                <Plus />{b.label}
              </button>
            ))}
            <button type="button" style={addButton} onClick={() => setCustom('wardrobe')}>
              <Plus />Свой размер…
            </button>
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: sp(6), paddingTop: sp(10), borderTop: `1px solid ${C.border}`, ...fs(12), color: C.text2 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: sp(6) }}><ZoneSwatch />зона падения</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: sp(6) }}><PassageSwatch />проход</span>
            </div>
          </div>
        </div>
        <p style={{ margin: sp(10, 0, 0), display: 'flex', alignItems: 'center', gap: sp(8), height: 18, ...hint }}>
          <Move />
          {state.notice ?? 'Перетащите предмет — у стены он прилипает сам'}
        </p>
        {custom && <CustomItemForm kind={custom} onClose={() => setCustom(null)} />}
      </div>

      <div style={{ marginTop: sp(16), paddingTop: sp(14), borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 32 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: sp(10) }}>
            <span style={stepNumber}>2</span>
            <label htmlFor="floor" style={sectionTitle}>Этаж</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: sp(10) }}>
            <div style={{ display: 'flex', height: H.md, boxSizing: 'border-box', border: `1px solid ${C.borderStrong}`, borderRadius: R.md, background: C.surface }}>
              <button type="button" aria-label="Этажом ниже" onClick={() => setFloor(settings.floor - 1)} style={stepButton}><StepMinus /></button>
              <input
                id="floor"
                className="num"
                type="number"
                min={1}
                max={settings.totalFloors}
                value={settings.floor}
                onChange={(e) => e.target.value && setFloor(Number(e.target.value))}
                style={{ width: 40, height: '100%', boxSizing: 'border-box', padding: 0, border: 0, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, background: 'transparent', textAlign: 'center', fontFamily: FONT.display, ...fs(18), fontWeight: 600, color: C.text }}
              />
              <button type="button" aria-label="Этажом выше" onClick={() => setFloor(settings.floor + 1)} style={stepButton}><StepPlus /></button>
            </div>
            <span style={{ ...fs(14), color: C.text, display: 'flex', alignItems: 'baseline' }}>
              из&nbsp;
              <input
                aria-label="Этажей в доме"
                className="num"
                type="number"
                min={1}
                max={40}
                value={settings.totalFloors}
                onChange={(e) => e.target.value && setFloor(settings.floor, Number(e.target.value))}
                style={{ width: `${String(settings.totalFloors).length}ch`, padding: 0, border: 0, background: 'transparent', ...fs(14), color: C.text, fontFamily: FONT.ui }}
              />
              &nbsp;<span style={{ color: C.text2 }}>·</span>&nbsp;<strong style={{ fontWeight: 700 }}>{gain === null ? '…' : `×${num(gain, 2)}`}</strong>
            </span>
          </div>
        </div>
        <p style={{ margin: sp(6, 0, 0), ...hint }}>
          {/* The visible word is plain text; a transparent select on top of it makes it choosable. */}
          <span style={{ position: 'relative', display: 'inline-block', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>
            {BUILDING.find((b) => b.value === settings.buildingType)!.label}
            <select
              aria-label="Тип дома"
              value={settings.buildingType}
              onChange={(e) => dispatch({ type: 'SET_BUILDING_TYPE', value: e.target.value as BuildingType })}
              style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', ...fs(13) }}
            >
              {BUILDING.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </span>
          {' '}дом: {gain === null ? 'считаем колебания здания…' : `${onFloor(settings.floor)} толчок сильнее в ${num(gain, 2)} раза.`}
        </p>
      </div>

      <div style={{ marginTop: sp(16), paddingTop: sp(14), borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: sp(10), height: 40 }}>
          <span style={stepNumber}>3</span>
          <label htmlFor="shake" style={sectionTitle}>Сила толчка</label>
          <span style={{ marginLeft: 'auto', fontFamily: FONT.display, fontWeight: 500, ...fs(32), letterSpacing: LS.display, color: C.text }}>
            {num(settings.intensity)} <span style={{ ...fs(18), letterSpacing: 0 }}>{points(settings.intensity).split(' ')[1]}</span>
          </span>
        </div>
        <p style={{ margin: 0, textAlign: 'right', ...hint }}>
          {floorAccel === null ? ' ' : `${onFloor(settings.floor)} это ускорение пола ${num(floorAccel, 2)} g`}
        </p>
        <div style={{ padding: sp(0, 12), marginTop: sp(12) }}>
          <div style={{ position: 'relative', height: 46 }}>
            <div style={{ position: 'absolute', right: `${100 - pct(CITY_DESIGN_INTENSITY)}%`, top: 0, height: 46, boxSizing: 'border-box', paddingRight: sp(6), borderRight: `1px dashed ${C.text}`, ...fs(12), fontWeight: 600, color: C.text, whiteSpace: 'nowrap' }}>
              расчётная для Алматы
            </div>
            {flags.map(({ a, item }, k) => {
              const left = pct(a.criticalIntensity!);
              const toLeft = k % 2 === 0 && left > 15;
              return (
                <div
                  key={a.itemId}
                  style={{
                    position: 'absolute', top: 22, height: 24, boxSizing: 'border-box', ...fs(12), fontWeight: 600, color: C.text, whiteSpace: 'nowrap',
                    ...(toLeft
                      ? { right: `${100 - left}%`, paddingRight: sp(6), borderRight: `1px solid ${C.danger}` }
                      : { left: `${left}%`, paddingLeft: sp(6), borderLeft: `1px solid ${C.danger}` }),
                  }}
                >
                  {item.name} <span style={{ fontWeight: 700, color: C.danger }}>{num(a.criticalIntensity!)}</span>
                </div>
              );
            })}
          </div>
          <div style={{ position: 'relative', height: 28 }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 12, height: 4, borderRadius: R.xs, background: C.border }} />
            <div style={{ position: 'absolute', left: 0, width: `${pct(settings.intensity)}%`, top: 12, height: 4, borderRadius: R.xs, background: C.poche }} />
            {flags.map(({ a }) => (
              <div key={a.itemId}>
                <div style={{ position: 'absolute', left: `${pct(a.criticalIntensity!)}%`, top: 0, width: 1, height: 9, background: C.danger }} />
                <div style={{ position: 'absolute', left: `${pct(a.criticalIntensity!)}%`, top: 9, width: 8, height: 8, marginLeft: -4, borderRadius: R.full, background: C.danger, border: `1px solid ${C.surface}` }} />
              </div>
            ))}
            <input
              id="shake"
              className="rng"
              type="range"
              min={5}
              max={10}
              step={0.1}
              value={settings.intensity}
              aria-valuetext={points(settings.intensity)}
              onChange={(e) => dispatch({ type: 'SET_INTENSITY', value: Number(e.target.value) })}
              style={{ position: 'absolute', left: -9, top: 0, width: 'calc(100% + 18px)', height: 28 }}
            />
          </div>
          <div aria-hidden="true" style={{ position: 'relative', height: 16, marginTop: sp(4), ...fs(12), color: C.text2 }}>
            {[5, 6, 7, 8, 9, 10].map((I) => (
              <span
                key={I}
                style={{
                  position: 'absolute', left: `${pct(I)}%`, transform: 'translateX(-50%)',
                  ...(I === CITY_DESIGN_INTENSITY ? { color: C.text, fontWeight: 700 } : {}),
                }}
              >
                {I}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const stepButton: CSSProperties = {
  width: 32, height: '100%', padding: 0, border: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
};
