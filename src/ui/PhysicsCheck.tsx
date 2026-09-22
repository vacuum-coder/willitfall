// «Проверка физики» (artboard C-PhysicsCheck-Desktop): the tilt experiment checks the very formula the site uses.
// Tilting the base by θ is the same as a horizontal push g·tanθ, so the block tips at θ = arctan(B / H).
// The table holds only the user's own measurements — it starts empty.

import { useEffect, useState, type CSSProperties } from 'react';
import { C, FONT, fs, sp, R, H, LS, card, button } from './ds';
import { Plus } from './icons';
import { TiltScene, TiltSide } from './TiltScene';
import { num } from './format';
import { useAssessment, useRoom } from '../state/RoomContext';
import {
  addMeasurement, loadExperiments, meanError, predictedAngle, rowStats, saveExperiments, MAX_ROWS, TARGET_ERROR, type Experiment,
} from '../state/experiments';

const label: CSSProperties = { display: 'flex', flexDirection: 'column', gap: sp(6), ...fs(12), fontWeight: 600, color: C.text2 };
const field: CSSProperties = { width: '100%', height: H.lg, boxSizing: 'border-box', padding: sp(0, 14), border: `1px solid ${C.borderStrong}`, borderRadius: R.md, background: C.surface, ...fs(14), color: C.text };
const th: CSSProperties = { padding: sp(8, 0), ...fs(12), fontWeight: 500, color: C.text2, textAlign: 'left' };
const td: CSSProperties = { padding: sp(8, 0), borderTop: `1px solid ${C.border}`, ...fs(14) };
const parse = (s: string) => Number(s.replace(',', '.'));

export function PhysicsCheck() {
  const { state } = useRoom();
  const result = useAssessment();
  const focus = (state.selectedId && state.room.items.find((i) => i.id === state.selectedId)) ||
    result.checklist.map((a) => state.room.items.find((i) => i.id === a.itemId)).find((i) => i && i.kind !== 'bed');
  const [name, setName] = useState(focus?.name ?? '');
  const [b, setB] = useState(focus ? String(focus.d) : '');
  const [h, setH] = useState(focus ? String(focus.height) : '');
  const [measured, setMeasured] = useState('');
  const [view, setView] = useState<'iso' | 'side'>('iso');
  const [rows, setRows] = useState<Experiment[]>(() => loadExperiments());
  useEffect(() => saveExperiments(rows), [rows]);
  // The engine answers a moment after the page opens: fill the calculator with that item once, if still untouched.
  const [prefilled, setPrefilled] = useState(!!focus);
  useEffect(() => {
    if (prefilled || !focus) return;
    setPrefilled(true);
    setName(focus.name); setB(String(focus.d)); setH(String(focus.height));
    setAngle(predictedAngle(focus.d, focus.height));
  }, [focus, prefilled]);

  const B = parse(b), Hh = parse(h);
  const ok = B > 0 && Hh > 0;
  const predicted = ok ? predictedAngle(B, Hh) : null;
  const [angle, setAngle] = useState(() => (focus ? predictedAngle(focus.d, focus.height) : 14));
  const m = parse(measured);
  const error = predicted !== null && measured.trim() !== '' && m > 0 ? Math.abs(m - predicted) / predicted : null;
  const filled = rows.filter((r) => r.measured.length).length;
  const avg = meanError(rows);

  const record = () => {
    if (!ok || !(m > 0)) return;
    setRows(addMeasurement(rows, { name: name.trim() || `Опыт ${rows.length + 1}`, B, H: Hh }, m));
    setMeasured('');
  };

  return (
    <main style={{ boxSizing: 'border-box', padding: sp(24, 32, 48), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 390px), 1fr))', columnGap: sp(24), rowGap: sp(24), maxWidth: 1440, margin: '0 auto', width: '100%' }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: FONT.display, fontWeight: 500, ...fs(32), letterSpacing: LS.display }}>Формула против опыта</h1>
        <section style={{ ...card, marginTop: sp(20), padding: sp(20) }} aria-labelledby="h-tilt">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 id="h-tilt" style={{ margin: 0, fontFamily: FONT.display, fontWeight: 500, ...fs(22) }}>Опыт с наклоном</h2>
            <div role="group" aria-label="Вид" style={{ display: 'flex', gap: sp(2), height: H.md, boxSizing: 'border-box', padding: sp(2), border: `1px solid ${C.borderStrong}`, borderRadius: R.md, background: C.surface }}>
              {(['iso', 'side'] as const).map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} style={{ height: 26, padding: sp(0, 10), border: 0, borderRadius: R.sm, background: view === v ? C.text : 'transparent', ...fs(13), fontWeight: view === v ? 600 : 500, color: view === v ? C.onAccent : C.text2 }}>
                  {v === 'iso' ? 'Обзор' : 'Сбоку'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: sp(14), border: `1px solid ${C.border}`, borderRadius: R.md, background: C.surface2, padding: sp(8) }}>
            {view === 'iso'
              ? <TiltScene ratio={ok ? B / Hh : 0.25} angleDeg={angle} predictedDeg={predicted ?? 90} />
              : <TiltSide ratio={ok ? B / Hh : 0.25} angleDeg={angle} predictedDeg={predicted ?? 90} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: sp(12), padding: sp(8, 4, 0), borderTop: `1px solid ${C.border}` }}>
              <label htmlFor="tilt" style={{ ...fs(13), color: C.text }}>Наклон доски</label>
              <div style={{ position: 'relative', flex: 1, height: 28 }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 12, height: 4, borderRadius: R.xs, background: C.border }} />
                <div style={{ position: 'absolute', left: 0, width: `${(angle / 45) * 100}%`, top: 12, height: 4, borderRadius: R.xs, background: C.poche }} />
                {predicted !== null && predicted <= 45 && <div title="предсказанный угол" style={{ position: 'absolute', left: `${(predicted / 45) * 100}%`, top: 4, width: 1, height: 20, background: C.danger }} />}
                <input id="tilt" className="rng" type="range" min={0} max={45} step={0.1} value={angle} onChange={(e) => setAngle(Number(e.target.value))} style={{ position: 'absolute', left: -9, top: 0, width: 'calc(100% + 18px)', height: 28 }} aria-valuetext={`${num(angle)} градуса`} />
              </div>
              <span style={{ fontFamily: FONT.display, ...fs(16), fontWeight: 600 }}>{num(angle)}°</span>
            </div>
          </div>

          <label style={{ ...label, marginTop: sp(16) }}>Что измеряете
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="брусок, коробка, стопка книг" style={field} />
          </label>
          <div style={{ marginTop: sp(12), display: 'grid', gridTemplateColumns: '1fr 1fr', gap: sp(16) }}>
            <label style={label}>Глубина основания, см<input inputMode="decimal" value={b} onChange={(e) => setB(e.target.value)} placeholder="замер" style={field} /></label>
            <label style={label}>Высота, см<input inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} placeholder="замер" style={field} /></label>
          </div>

          <p style={{ margin: sp(16, 0, 0), ...fs(12), fontWeight: 600, color: C.text2 }}>Предсказанный угол опрокидывания</p>
          <p style={{ margin: sp(4, 0, 0), display: 'flex', alignItems: 'baseline', gap: sp(12) }}>
            <span style={{ fontFamily: FONT.display, fontWeight: 500, ...fs(44), letterSpacing: LS.number }}>{predicted === null ? '—' : `${num(predicted)}°`}</span>
            {ok && <span style={{ ...fs(13), color: C.text2 }}>= arctg ({num(B, 0)} / {num(Hh, 0)})</span>}
          </p>

          <div style={{ marginTop: sp(12), paddingTop: sp(12), borderTop: `1px solid ${C.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: sp(16), alignItems: 'end' }}>
            <label style={label}>Измеренный угол, °<input inputMode="decimal" value={measured} onChange={(e) => setMeasured(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && record()} placeholder="введите замер" style={field} /></label>
            <div style={label}>
              Ошибка
              <span style={{ display: 'flex', alignItems: 'center', gap: sp(10), height: H.lg }}>
                <span style={{ fontFamily: FONT.display, ...fs(22), color: error === null ? C.text2 : error <= TARGET_ERROR ? C.safe : C.danger }}>{error === null ? '—' : `${num(error * 100, 1)}%`}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', height: H.sm, padding: sp(0, 8), borderRadius: R.sm, background: C.safeTint, ...fs(12), color: C.safe }}>цель ≤ 10%</span>
              </span>
            </div>
          </div>

          <div style={{ marginTop: sp(16), paddingTop: sp(12), borderTop: `1px solid ${C.border}` }}>
            <p style={{ margin: 0, ...fs(12), fontWeight: 600, color: C.text2 }}>Как провести опыт</p>
            <ol style={{ margin: sp(8, 0, 0), padding: 0, listStyle: 'none', ...fs(13), color: C.text }}>
              {['Прижмите предмет к упору у нижнего края', 'Положите телефон с уровнем на доску', 'Плавно поднимайте доску до опрокидывания', 'Запишите угол, повторите 3 раза'].map((s, k) => (
                <li key={s} style={{ display: 'flex', gap: sp(12), padding: sp(2, 0) }}><span style={{ fontFamily: FONT.display, color: C.text }}>{k + 1}</span>{s}</li>
              ))}
            </ol>
          </div>
          <div style={{ marginTop: sp(16), display: 'flex', gap: sp(8) }}>
            <button type="button" onClick={record} disabled={!ok || !(m > 0)} style={{ ...button.primary, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: sp(8), opacity: ok && m > 0 ? 1 : 0.5 }}>
              <span style={{ filter: 'brightness(0) invert(1)', display: 'inline-flex' }}><Plus /></span>Записать в таблицу
            </button>
            <button type="button" onClick={() => setMeasured('')} style={button.secondary}>Сбросить</button>
          </div>
        </section>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: sp(24), minWidth: 0 }}>
        <section style={{ ...card, padding: sp(20) }} aria-labelledby="h-table">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: sp(12), flexWrap: 'wrap' }}>
            <h2 id="h-table" style={{ margin: 0, fontFamily: FONT.display, fontWeight: 500, ...fs(22) }}>Таблица опытов</h2>
            <span style={{ ...fs(13), color: C.text2 }}>заполнено {filled} из {MAX_ROWS}</span>
            {filled === 0 && <span style={{ marginLeft: 'auto', ...fs(12), color: C.text2 }}>Замеров пока нет — таблица заполняется по реальным опытам</span>}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ marginTop: sp(12), width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 36 }} aria-label="Номер" />
                  <th style={th}>Предмет</th>
                  <th style={{ ...th, textAlign: 'right' }}>B, см</th>
                  <th style={{ ...th, textAlign: 'right' }}>H, см</th>
                  <th style={{ ...th, textAlign: 'right' }}>Предсказано</th>
                  <th style={{ ...th, textAlign: 'center' }}>Замеры</th>
                  <th style={{ ...th, textAlign: 'right' }}>Среднее</th>
                  <th style={{ ...th, textAlign: 'right' }}>Ошибка</th>
                  <th style={{ ...th, width: 32 }} aria-label="Удалить" />
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: MAX_ROWS }, (_, k) => {
                  const r = rows[k];
                  if (!r) {
                    return (
                      <tr key={`empty${k}`}>
                        <td style={{ ...td, fontFamily: FONT.display }}>{k + 1}</td>
                        <td style={{ ...td, color: C.text2 }} colSpan={8}>
                          <button type="button" onClick={() => document.getElementById('tilt')?.scrollIntoView({ behavior: 'smooth' })} style={{ padding: 0, border: 0, background: 'transparent', display: 'inline-flex', alignItems: 'center', gap: sp(6), ...fs(14), color: C.text2 }}><Plus />добавьте опыт</button>
                        </td>
                      </tr>
                    );
                  }
                  const s = rowStats(r);
                  return (
                    <tr key={r.id}>
                      <td style={{ ...td, fontFamily: FONT.display }}>{k + 1}</td>
                      <td style={td}>{r.name}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{num(r.B, 0)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{num(r.H, 0)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{num(s.predicted)}°</td>
                      <td style={{ ...td, textAlign: 'center', color: C.text2 }}>
                        {r.measured.map((v) => `${num(v)}°`).join(', ')}{' '}
                        <button type="button" onClick={() => { setName(r.name); setB(String(r.B)); setH(String(r.H)); document.getElementById('tilt')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ padding: 0, border: 0, background: 'transparent', display: 'inline-flex', alignItems: 'center', gap: sp(4), ...fs(13), color: C.text2 }}><Plus />замер</button>
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>{s.mean === null ? '—' : `${num(s.mean)}°`}</td>
                      <td style={{ ...td, textAlign: 'right', color: s.error === null ? C.text2 : s.error <= TARGET_ERROR ? C.safe : C.danger }}>{s.error === null ? '—' : `${num(s.error * 100)}%`}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <button type="button" aria-label={`Удалить опыт «${r.name}»`} onClick={() => setRows(rows.filter((x) => x.id !== r.id))} style={{ padding: 0, border: 0, background: 'transparent', ...fs(14), color: C.text2 }}>×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ ...card, padding: sp(20) }} aria-labelledby="h-chart">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: sp(12) }}>
            <h2 id="h-chart" style={{ margin: 0, fontFamily: FONT.display, fontWeight: 500, ...fs(22) }}>Предсказано и измерено</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: sp(16), ...fs(12), color: C.text }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: sp(6) }}><span style={{ width: 8, height: 8, borderRadius: R.full, background: C.text }} />опыт</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: sp(6) }}><span style={{ width: 14, borderTop: `1.5px dashed ${C.text}` }} />идеал: измерено = предсказано</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: sp(6) }}><span style={{ width: 12, height: 8, background: C.safeTint }} />ошибка до 10%</li>
            </ul>
          </div>
          <div style={{ marginTop: sp(12), display: 'grid', gridTemplateColumns: 'minmax(0, 260px) 1fr', gap: sp(32), alignItems: 'start' }}>
            <Scatter rows={rows} />
            <div>
              <p style={{ margin: 0, ...fs(13), color: C.text }}>Средняя ошибка · {filled} {filled === 1 ? 'опыт' : filled >= 2 && filled <= 4 ? 'опыта' : 'опытов'} из {MAX_ROWS}</p>
              <p style={{ margin: sp(8, 0, 0), display: 'flex', alignItems: 'baseline', gap: sp(8) }}>
                <span style={{ fontFamily: FONT.display, fontWeight: 500, ...fs(44), letterSpacing: LS.number, color: avg === null ? C.text2 : avg <= TARGET_ERROR ? C.safe : C.danger }}>{avg === null ? '—' : `${num(avg * 100)}%`}</span>
                <span style={{ ...fs(16), color: C.text }}>· цель ≤ 10%</span>
              </p>
              <ErrorMeter value={avg} />
              <p style={{ margin: sp(16, 0, 0), ...fs(14), color: C.text }}>
                {filled < 3
                  ? 'Проведите хотя бы три опыта — средняя ошибка и точки на графике появятся здесь автоматически.'
                  : avg !== null && avg <= TARGET_ERROR
                    ? 'Формула сходится с опытом: средняя ошибка в пределах цели.'
                    : 'Ошибка больше цели: проверьте, что упор не даёт предмету скользить и доска поднимается плавно.'}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Scatter({ rows }: { rows: Experiment[] }) {
  const pts = rows.map(rowStats).filter((s) => s.mean !== null) as { predicted: number; mean: number }[];
  const vals = pts.flatMap((p) => [p.predicted, p.mean]);
  const lo = Math.min(10, ...vals.map((v) => Math.floor(v / 5) * 5)), hi = Math.max(35, ...vals.map((v) => Math.ceil(v / 5) * 5));
  const size = 200, pad = 30;
  const X = (v: number) => pad + ((v - lo) / (hi - lo)) * size, Y = (v: number) => pad + size - ((v - lo) / (hi - lo)) * size;
  const ticks = Array.from({ length: (hi - lo) / 5 + 1 }, (_, k) => lo + k * 5);
  return (
    <svg viewBox={`0 0 ${size + pad + 10} ${size + pad + 26}`} width="100%" role="img" aria-label={pts.length ? `${pts.length} опытов на графике` : 'Точек пока нет'} style={{ display: 'block' }}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={X(t)} y1={pad} x2={X(t)} y2={pad + size} style={{ stroke: C.border }} strokeWidth="1" />
          <line x1={pad} y1={Y(t)} x2={pad + size} y2={Y(t)} style={{ stroke: C.border }} strokeWidth="1" />
          <text x={X(t)} y={pad + size + 16} textAnchor="middle" fontSize="11" style={{ fill: C.text2 }}>{t}</text>
          <text x={pad - 6} y={Y(t) + 4} textAnchor="end" fontSize="11" style={{ fill: C.text2 }}>{t}</text>
        </g>
      ))}
      <polygon points={`${X(lo)},${Y(lo * 0.9)} ${X(hi)},${Y(Math.min(hi, hi * 0.9))} ${X(hi)},${Y(hi)} ${X(hi / 1.1)},${Y(hi)} ${X(lo)},${Y(lo * 1.1)}`} style={{ fill: C.safeTint }} />
      <line x1={X(lo)} y1={Y(lo)} x2={X(hi)} y2={Y(hi)} style={{ stroke: C.text }} strokeWidth="1.2" strokeDasharray="5 4" />
      {pts.map((p, k) => <circle key={k} cx={X(p.predicted)} cy={Y(p.mean)} r="4" style={{ fill: C.text }} />)}
      {!pts.length && <text x={pad + size / 2} y={pad + size / 2} textAnchor="middle" fontSize="12" style={{ fill: C.text2 }}>Точки появятся после опытов</text>}
      <text x={pad + 6} y={pad + 14} fontSize="11" style={{ fill: C.text2 }}>измерено, °</text>
      <text x={pad + size - 4} y={pad + size - 6} textAnchor="end" fontSize="11" style={{ fill: C.text2 }}>предсказано, °</text>
    </svg>
  );
}

function ErrorMeter({ value }: { value: number | null }) {
  const max = 0.15, pct = (v: number) => `${(Math.min(v, max) / max) * 100}%`;
  return (
    <div style={{ marginTop: sp(16) }}>
      <div style={{ position: 'relative', height: 28 }}>
        <div style={{ position: 'absolute', left: pct(TARGET_ERROR), top: 0, height: 28, boxSizing: 'border-box', paddingRight: sp(6), transform: 'translateX(-100%)', borderRight: `1px dashed ${C.text}`, ...fs(12), fontWeight: 600, color: C.text, whiteSpace: 'nowrap' }}>цель ≤ 10%</div>
      </div>
      <div style={{ position: 'relative', height: 6, borderRadius: R.xs, background: C.border }}>
        <div style={{ position: 'absolute', left: pct(TARGET_ERROR), right: 0, top: 0, bottom: 0, borderRadius: R.xs, background: C.dangerTint }} />
        {value !== null && <div style={{ position: 'absolute', left: 0, width: pct(value), top: 0, bottom: 0, borderRadius: R.xs, background: value <= TARGET_ERROR ? C.safe : C.danger }} />}
      </div>
      <div aria-hidden="true" style={{ position: 'relative', height: 16, marginTop: sp(6), ...fs(12), color: C.text2 }}>
        {[0, 0.05, 0.1, 0.15].map((v) => <span key={v} style={{ position: 'absolute', left: pct(v), transform: v === 0 ? 'none' : v === max ? 'translateX(-100%)' : 'translateX(-50%)' }}>{num(v * 100, 0)}%</span>)}
      </div>
    </div>
  );
}
