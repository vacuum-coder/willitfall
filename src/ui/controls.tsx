// Shared controls: floor stepper and the shaking-strength scale (desktop C-Desktop and phone C-Mobile sizes).

import type { CSSProperties } from 'react';
import { C, FONT, fs, sp, R, H } from './ds';
import { StepMinus, StepPlus } from './icons';
import { num, onFloor, points } from './format';
import { status } from './verdict';
import { useRoom, type RoomAssessment } from '../state/RoomContext';
import { CITY_DESIGN_INTENSITY } from '../data/records';
import { layoutFlags } from './scaleLabels';
import { useElementWidth, textWidth } from './useElementWidth';
import type { BuildingType } from '../physics/types';

export const BUILDING: { value: BuildingType; label: string }[] = [
  { value: 'panel', label: 'панельный' },
  { value: 'brick', label: 'кирпичный' },
  { value: 'monolith', label: 'монолитный каркас' },
];

/** Floor peak at 7 points → gain over the ground and floor acceleration at the current intensity. */
export function floorNumbers(result: RoomAssessment, intensity: number) {
  const pfa7 = result.peak.status === 'ready' ? result.peak.pfa7G : null;
  return {
    pfa7,
    // How much harder this floor shakes than the ground floor, both computed the same way.
    gain: pfa7 === null || result.peak1 === null ? null : pfa7 / result.peak1,
    floorAccel: pfa7 === null ? null : pfa7 * 2 ** (intensity - 7),
  };
}

const stepButton: CSSProperties = {
  width: 32, height: '100%', padding: 0, border: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

export function FloorStepper({ id, compact = false, gain }: { id: string; compact?: boolean; gain: number | null }) {
  const { state, dispatch } = useRoom();
  const { floor, totalFloors } = state.settings;
  const setFloor = (f: number, total = totalFloors) => dispatch({ type: 'SET_FLOOR', floor: f, totalFloors: total });
  const text = compact ? fs(13) : fs(14);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? sp(6) : sp(10) }}>
      <div style={{ display: 'flex', height: H.md, boxSizing: 'border-box', border: `1px solid ${C.borderStrong}`, borderRadius: R.md, background: C.surface }}>
        <button type="button" aria-label="Этажом ниже" onClick={() => setFloor(floor - 1)} style={stepButton}><StepMinus /></button>
        <input
          id={id}
          className="num"
          type="number"
          min={1}
          max={totalFloors}
          value={floor}
          onChange={(e) => e.target.value && setFloor(Number(e.target.value))}
          style={{ width: compact ? 32 : 40, height: '100%', boxSizing: 'border-box', padding: 0, border: 0, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, background: 'transparent', textAlign: 'center', fontFamily: FONT.display, ...fs(compact ? 16 : 18), fontWeight: 600, color: C.text }}
        />
        <button type="button" aria-label="Этажом выше" onClick={() => setFloor(floor + 1)} style={stepButton}><StepPlus /></button>
      </div>
      <span style={{ ...text, color: C.text, display: 'flex', alignItems: 'baseline', whiteSpace: 'nowrap' }}>
        из&nbsp;
        <input
          aria-label="Этажей в доме"
          className="num"
          type="number"
          min={1}
          max={40}
          value={totalFloors}
          onChange={(e) => e.target.value && setFloor(floor, Number(e.target.value))}
          style={{ width: `${String(totalFloors).length}ch`, padding: 0, border: 0, background: 'transparent', ...text, color: C.text, fontFamily: FONT.ui }}
        />
        &nbsp;<span style={{ color: C.text2 }}>·</span>&nbsp;<strong style={{ fontWeight: 700 }}>{gain === null ? '…' : `×${num(gain, 2)}`}</strong>
      </span>
    </div>
  );
}

/** «панельный дом: на 8-м этаже толчок сильнее в 2,91 раза.» with the building type choosable in place. */
export function BuildingLine({ gain }: { gain: number | null }) {
  const { state, dispatch } = useRoom();
  const { buildingType, floor } = state.settings;
  return (
    <p style={{ margin: sp(6, 0, 0), ...fs(13), color: C.text2 }}>
      {/* The visible word is plain text; a transparent select on top of it makes it choosable. */}
      <span style={{ position: 'relative', display: 'inline-block', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>
        {BUILDING.find((b) => b.value === buildingType)!.label}
        <select
          aria-label="Тип дома"
          value={buildingType}
          onChange={(e) => dispatch({ type: 'SET_BUILDING_TYPE', value: e.target.value as BuildingType })}
          style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', ...fs(13) }}
        >
          {BUILDING.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>
      </span>
      {' '}дом: {gain === null ? 'считаем колебания здания…' : `${onFloor(floor)} толчок сильнее в ${num(gain, 2)} раза.`}
    </p>
  );
}

const pct = (I: number) => ((I - 5) / 5) * 100;

/** Slider 5–10 points with the design intensity and every item's threshold marked on it; labels never overlap. */
export function IntensityScale({ id, compact = false, result }: { id: string; compact?: boolean; result: RoomAssessment }) {
  const { state, dispatch } = useRoom();
  const { intensity } = state.settings;
  const [box, W] = useElementWidth<HTMLDivElement>(344);
  const rowH = compact ? 20 : 22;
  const flags = result.assessments
    .filter((a) => a.criticalIntensity !== null && a.criticalIntensity >= 5 && a.criticalIntensity <= 10 && status(a) !== 'safe' && a.mode !== 'slides')
    .sort((a, b) => a.criticalIntensity! - b.criticalIntensity!)
    .slice(0, 4)
    .map((a) => ({ a, item: state.room.items.find((i) => i.id === a.itemId)! }));
  const label = (f: (typeof flags)[number]) => `${f.item.name} ${num(f.a.criticalIntensity!)}`;
  const designText = 'расчётная для Алматы';
  const layout = layoutFlags(
    flags.map((f) => ({ id: f.a.itemId, x: (pct(f.a.criticalIntensity!) / 100) * W, width: textWidth(label(f)) + 2 })),
    { x: (pct(CITY_DESIGN_INTENSITY) / 100) * W, width: textWidth(designText) + 8 },
    W,
  );
  const height = layout.rows * rowH + (compact ? 0 : 2);

  return (
    <div style={{ padding: sp(0, 12), marginTop: compact ? sp(6) : sp(12) }}>
      <div ref={box} style={{ position: 'relative', height }}>
        <div style={{ position: 'absolute', right: `${100 - pct(CITY_DESIGN_INTENSITY)}%`, top: 0, height, boxSizing: 'border-box', paddingRight: sp(6), borderRight: `1px dashed ${C.text}`, ...fs(12), fontWeight: 600, color: C.text, whiteSpace: 'nowrap' }}>
          {designText}
        </div>
        {flags.map((f) => {
          const p = layout.placed.find((x) => x.id === f.a.itemId)!;
          const left = pct(f.a.criticalIntensity!);
          return (
            <div
              key={f.a.itemId}
              style={{
                position: 'absolute', top: p.row * rowH, height: height - p.row * rowH, boxSizing: 'border-box', ...fs(12), fontWeight: 600, color: C.text, whiteSpace: 'nowrap',
                ...(p.side === 'left'
                  ? { right: `${100 - left}%`, paddingRight: sp(6), borderRight: `1px solid ${C.danger}` }
                  : { left: `${left}%`, paddingLeft: sp(6), borderLeft: `1px solid ${C.danger}` }),
              }}
            >
              {f.item.name} <span style={{ fontWeight: 700, color: C.danger }}>{num(f.a.criticalIntensity!)}</span>
            </div>
          );
        })}
      </div>
      <div style={{ position: 'relative', height: 28 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 12, height: 4, borderRadius: R.xs, background: C.border }} />
        <div style={{ position: 'absolute', left: 0, width: `${pct(intensity)}%`, top: 12, height: 4, borderRadius: R.xs, background: C.poche }} />
        {flags.map(({ a }) => (
          <div key={a.itemId}>
            <div style={{ position: 'absolute', left: `${pct(a.criticalIntensity!)}%`, top: 0, width: 1, height: 9, background: C.danger }} />
            <div style={{ position: 'absolute', left: `${pct(a.criticalIntensity!)}%`, top: 9, width: 8, height: 8, marginLeft: -4, borderRadius: R.full, background: C.danger, border: `1px solid ${C.surface}` }} />
          </div>
        ))}
        <input
          id={id}
          className="rng"
          type="range"
          min={5}
          max={10}
          step={0.1}
          value={intensity}
          aria-valuetext={points(intensity)}
          onChange={(e) => dispatch({ type: 'SET_INTENSITY', value: Number(e.target.value) })}
          style={{ position: 'absolute', left: -9, top: 0, width: 'calc(100% + 18px)', height: 28 }}
        />
      </div>
      <div aria-hidden="true" style={{ position: 'relative', height: 16, marginTop: compact ? 0 : sp(4), ...fs(12), color: C.text2 }}>
        {[5, 6, 7, 8, 9, 10].map((I) => (
          <span key={I} style={{ position: 'absolute', left: `${pct(I)}%`, transform: 'translateX(-50%)', ...(I === CITY_DESIGN_INTENSITY ? { color: C.text, fontWeight: 700 } : {}) }}>
            {I}
          </span>
        ))}
      </div>
    </div>
  );
}
