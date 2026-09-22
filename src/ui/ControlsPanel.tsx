// Left column of C-Desktop: 1 room + plan, 2 floor, 3 shaking strength.

import { useState, type CSSProperties } from 'react';
import { C, FONT, fs, sp, R, H, LS, card, stepNumber, selectStyle } from './ds';
import { Chevron, Move, Plus, ZoneSwatch, PassageSwatch } from './icons';
import { FloorStepper, BuildingLine, IntensityScale, floorNumbers } from './controls';
import { PlanView } from './PlanView';
import { WallsPlan } from './WallsPlan';
import { CustomItemForm } from './CustomItemForm';
import { num, onFloor, points } from './format';
import { useRoom, type RoomAssessment } from '../state/RoomContext';
import { PANEL_BEDROOM } from '../data/presets';
import type { FurnitureKind } from '../physics/types';

const ADD: { label: string; productKey?: string; kind: FurnitureKind }[] = [
  { label: 'Шкаф', productKey: 'ikea-pax-236', kind: 'wardrobe' },
  { label: 'Стеллаж', productKey: 'ikea-billy', kind: 'bookshelf' },
  { label: 'Комод', productKey: 'ikea-malm-4', kind: 'dresser' },
  { label: 'Зеркало', productKey: 'ikea-ikornnes', kind: 'mirror' },
  { label: 'Холодильник', kind: 'fridge' },
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
  const { gain, floorAccel } = floorNumbers(result, settings.intensity);
  const isPreset = room.id === PANEL_BEDROOM.id;


  return (
    <section aria-label="Параметры: комната, этаж, сила толчка" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: sp(10), height: 32 }}>
        <span style={stepNumber}>1</span>
        <label htmlFor="room-select" style={sectionTitle}>Комната</label>
        <div role="group" aria-label="Что правим" style={{ marginLeft: 'auto', display: 'flex', height: H.md, boxSizing: 'border-box', border: `1px solid ${C.borderStrong}`, borderRadius: R.md, overflow: 'hidden' }}>
          {([['furniture', 'Мебель'], ['walls', 'Стены']] as const).map(([mode, text]) => {
            const on = (mode === 'walls') === !!state.walls;
            return (
              <button key={mode} type="button" aria-pressed={on} onClick={() => dispatch({ type: mode === 'walls' ? 'BEGIN_WALLS' : 'END_WALLS' })} style={{ border: 0, padding: sp(0, 12), background: on ? C.text : C.surface, color: on ? C.onAccent : C.text, ...fs(13), fontWeight: on ? 700 : 500 }}>
                {text}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ position: 'relative', marginTop: sp(10) }}>
        <select
          id="room-select"
          value={isPreset ? 'preset' : 'own'}
          onChange={(e) => {
            if (e.target.value === 'preset') dispatch({ type: 'LOAD_PRESET', room: PANEL_BEDROOM });
            else dispatch({ type: 'BEGIN_WALLS' });
          }}
          style={{ ...selectStyle, width: '100%', padding: sp(0, 36, 0, 14) }}
        >
          <option value="preset" disabled={!!state.walls}>{PANEL_BEDROOM.name}</option>
          <option value="own">Своя планировка</option>
        </select>
        <Chevron right={14} />
      </div>

      {state.walls ? (
        <div style={{ ...card, marginTop: sp(12), padding: sp(12) }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: sp(8) }}>
            <h2 style={{ margin: 0, fontFamily: FONT.display, fontWeight: 600, ...fs(22) }}>План</h2>
            <span style={{ ...fs(12), color: C.text2, marginLeft: 'auto' }}>Шаблон</span>
            <div role="group" aria-label="Шаблон комнаты" style={{ display: 'flex', height: H.md, boxSizing: 'border-box', border: `1px solid ${C.borderStrong}`, borderRadius: R.md, overflow: 'hidden' }}>
              {([['rect', 'Прямоугольная', 4], ['L', 'Г', 6], ['U', 'П', 8]] as const).map(([t, text, count]) => {
                const on = room.vertices.length === count;
                return (
                  <button key={t} type="button" aria-pressed={on} onClick={() => dispatch({ type: 'APPLY_ROOM_TEMPLATE', template: t })} style={{ border: 0, padding: sp(0, 12), background: on ? C.text : C.surface, color: on ? C.onAccent : C.text, ...fs(13), fontWeight: on ? 700 : 500 }}>
                    {text}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ marginTop: sp(8), display: 'flex', justifyContent: 'center' }}>
            <WallsPlan room={room} dispatch={dispatch} width={340} height={340} />
          </div>
        </div>
      ) : (
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
      )}

      <div style={{ marginTop: sp(16), paddingTop: sp(14), borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 32 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: sp(10) }}>
            <span style={stepNumber}>2</span>
            <label htmlFor="floor" style={sectionTitle}>Этаж</label>
          </div>
          <FloorStepper id="floor" gain={gain} />
        </div>
        <BuildingLine gain={gain} />
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
        <IntensityScale id="shake" result={result} />
      </div>
    </section>
  );
}
