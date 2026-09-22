// «Как посчитано» (artboards C-HowItWorks-Desktop / -Mobile). The layout follows the artboard; the formulas
// and numbers are the ones the engine really uses, for the selected (or most dangerous) item.

import type { CSSProperties, ReactNode } from 'react';
import { C, FONT, fs, sp, R, LS, card, button } from './ds';
import { FallArrow } from './icons';
import { PlanView } from './PlanView';
import { floorNom, genitive, num, onFloor, points } from './format';
import { status, tag } from './verdict';
import { useAssessment, useFloorPeaks, useRoom } from '../state/RoomContext';
import { criticalIntensity, WALL_THROW } from '../physics/assess';
import { COM_FRACTION, tiltAngleDeg } from '../physics/tipping';
import { intensityToAccel } from '../physics/intensity';
import { periodFor, STOREY_HEIGHT_M } from '../data/buildings';
import { RECORDS, CITY_DESIGN_INTENSITY } from '../data/records';
import type { Item } from '../physics/types';

const h2: CSSProperties = { margin: 0, fontFamily: FONT.display, fontWeight: 500, ...fs(22) };
const body: CSSProperties = { margin: sp(6, 0, 0), ...fs(14), color: C.text };
const small: CSSProperties = { ...fs(12), color: C.text2 };

function Section({ n, title, children, aside }: { n: number; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section style={{ marginTop: sp(24) }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: sp(10) }}>
        <span style={{ fontFamily: FONT.display, fontWeight: 500, ...fs(22) }}>{n}</span>
        <h2 style={h2}>{title}</h2>
        {aside && <span style={{ marginLeft: 'auto' }}>{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Fraction({ top, bottom }: { top: string; bottom: string }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', verticalAlign: 'middle', margin: sp(0, 4) }}>
      <span style={{ padding: sp(0, 4), borderBottom: `1.5px solid ${C.text}` }}>{top}</span>
      <span>{bottom}</span>
    </span>
  );
}

/** Upright block with its forces, and the same block tilted until its centre of mass is over the edge. */
function TiltDiagram({ item }: { item: Item }) {
  const hRatio = COM_FRACTION[item.filling ?? 'even'];
  const scale = 155 / item.height;
  const w = item.d * scale, H = item.height * scale, ground = 190;
  const theta = tiltAngleDeg(item.d, item.height, item.filling ?? 'even');
  const x0 = 95, comY = ground - H * hRatio, px = 300 + w;
  // Tilted by θ about the edge, the centre of mass stands right above it at its distance from the edge.
  const reach = Math.hypot(w / 2, H * hRatio);
  return (
    <svg viewBox="0 0 420 230" width="100%" role="img" aria-label={`Шкаф глубиной ${item.d} и высотой ${item.height} см опрокидывается, когда наклон доходит до ${num(theta)} градуса`} style={{ display: 'block' }}>
      <defs>
        <marker id="hArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,1 L9,5 L0,9 z" style={{ fill: C.text }} /></marker>
      </defs>
      <line x1="30" y1={ground} x2="400" y2={ground} style={{ stroke: C.text }} strokeWidth="4" />
      <rect x={x0} y={ground - H} width={w} height={H} style={{ fill: C.dangerTint, stroke: C.danger }} strokeWidth="1.4" />
      <line x1={x0} y1={ground - H - 12} x2={x0 + w} y2={ground - H - 12} style={{ stroke: C.text2 }} strokeWidth="0.9" />
      <text x={x0 + w / 2} y={ground - H - 18} textAnchor="middle" style={{ ...small, fill: C.text2 }}>глубина {item.d}</text>
      <line x1={x0 - 14} y1={ground - H} x2={x0 - 14} y2={ground} style={{ stroke: C.text2 }} strokeWidth="0.9" />
      <text x={x0 - 20} y={ground - H / 2} transform={`rotate(-90 ${x0 - 20} ${ground - H / 2})`} textAnchor="middle" style={{ ...small, fill: C.text2 }}>высота {item.height}</text>
      <circle cx={x0 + w / 2} cy={comY} r="5" style={{ fill: C.surface, stroke: C.text }} strokeWidth="1.4" />
      <line x1={x0 + w / 2} y1={comY} x2={x0 + w / 2} y2={comY + 45} style={{ stroke: C.text }} strokeWidth="1.2" markerEnd="url(#hArr)" />
      <text x={x0 + w / 2 + 4} y={comY + 60} style={{ ...small, fill: C.text, fontWeight: 600 }}>вес</text>
      <line x1={x0 + w / 2} y1={comY} x2={x0 + w / 2 + 60} y2={comY} style={{ stroke: C.text }} strokeWidth="1.2" markerEnd="url(#hArr)" />
      <text x={x0 + w / 2 + 26} y={comY - 8} style={{ ...small, fill: C.text, fontWeight: 600 }}>толчок</text>
      <g transform={`rotate(${theta} ${px} ${ground})`}>
        <rect x={px - w} y={ground - H} width={w} height={H} style={{ fill: C.dangerTint, stroke: C.danger }} strokeWidth="1.4" />
        <circle cx={px - w / 2} cy={comY} r="5" style={{ fill: C.surface, stroke: C.text }} strokeWidth="1.4" />
      </g>
      <line x1={px} y1={ground} x2={px} y2={ground - reach - 20} style={{ stroke: C.danger }} strokeWidth="1" strokeDasharray="4 3" />
      <circle cx={px} cy={ground} r="4" style={{ fill: C.danger }} />
      <text x={px + 8} y={ground - 8} style={{ ...small, fill: C.text, fontWeight: 600 }}>ребро</text>
      <text x={px + 10} y={ground - 40} style={{ ...small, fill: C.danger, fontWeight: 700 }}>{num(theta)}°</text>
      <text x={px + 8} y={ground - reach - 34} style={{ ...small, fill: C.text, fontWeight: 600 }}><tspan x={px + 8}>центр масс</tspan><tspan x={px + 8} dy="14">над ребром</tspan></text>
      <text x="60" y={ground + 26} style={{ ...small, fill: C.text2 }}>толчок слабее — стоит</text>
      <text x="245" y={ground + 26} style={{ ...small, fill: C.text2 }}>сильнее — встаёт на ребро</text>
    </svg>
  );
}

/** The building as stacked floors with the computed shaking of each floor as an arrow. */
function BuildingDiagram({ gains, floor }: { gains: (number | null)[]; floor: number }) {
  const n = gains.length, top = 20, ground = 180, rowH = Math.min(18, (ground - top) / n);
  const max = Math.max(1, ...gains.map((g) => g ?? 1));
  const x0 = 60, wBld = 110, arrow = (g: number) => 20 + (g / max) * 120;
  const y = (f: number) => ground - f * rowH;
  return (
    <svg viewBox="0 0 400 200" width="100%" role="img" aria-label={`Дом в ${n} этажей: на каждом этаже стрелкой показано, во сколько раз сильнее качает пол`} style={{ display: 'block' }}>
      <defs>
        <marker id="bArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,1 L9,5 L0,9 z" style={{ fill: C.danger }} /></marker>
        <marker id="bArrInk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,1 L9,5 L0,9 z" style={{ fill: C.text }} /></marker>
      </defs>
      {gains.map((g, i) => {
        const f = i + 1, yy = y(f);
        return (
          <g key={f}>
            <rect x={x0} y={yy} width={wBld} height={rowH} style={{ fill: f === floor ? C.dangerTint : C.surface, stroke: C.text }} strokeWidth="1.2" />
            {g !== null && <line x1={x0 + wBld + 14} y1={yy + rowH / 2} x2={x0 + wBld + 14 + arrow(g)} y2={yy + rowH / 2} style={{ stroke: f === floor ? C.danger : C.text }} strokeWidth={f === floor ? 1.6 : 0.8} markerEnd={f === floor ? 'url(#bArr)' : 'url(#bArrInk)'} />}
            {(f === 1 || f === floor || f === n) && <text x={x0 - 8} y={yy + rowH / 2 + 4} textAnchor="end" style={{ ...small, fill: f === floor ? C.danger : C.text2, fontWeight: 600 }}>{f}</text>}
          </g>
        );
      })}
      <line x1="20" y1={ground} x2="380" y2={ground} style={{ stroke: C.text }} strokeWidth="4" />
      {gains[floor - 1] != null && (
        <text x={x0 + wBld + 20 + arrow(gains[floor - 1]!)} y={y(floor) + rowH / 2 + 4} style={{ ...small, fill: C.danger, fontWeight: 700 }}>×{num(gains[floor - 1]!, 2)}</text>
      )}
      {gains[0] != null && floor !== 1 && (
        <text x={x0 + wBld + 20 + arrow(gains[0]!)} y={y(1) + rowH / 2 + 4} style={{ ...small, fill: C.text, fontWeight: 700 }}>×1</text>
      )}
    </svg>
  );
}

export function HowItWorks() {
  const { state, dispatch } = useRoom();
  const result = useAssessment();
  const { settings, room } = state;
  const floors = Array.from({ length: settings.totalFloors }, (_, i) => i + 1);
  const peaks = useFloorPeaks(settings, floors);
  const p1 = peaks.get(1)!, ground = p1.status === 'ready' ? p1.pfa7G : null;
  const gains = floors.map((f) => { const p = peaks.get(f)!; return p.status === 'ready' && ground !== null ? p.pfa7G / ground : null; });
  const pfa7 = result.peak.status === 'ready' ? result.peak.pfa7G : null;
  const gain = pfa7 === null || ground === null ? null : pfa7 / ground;

  const chosen = state.selectedId ? room.items.find((i) => i.id === state.selectedId && i.kind !== 'bed' && i.mount.kind !== 'wall') : undefined;
  const item = chosen ?? result.checklist.map((a) => room.items.find((i) => i.id === a.itemId)!).find((i) => i && i.kind !== 'bed' && i.mount.kind !== 'wall');
  const a = item && result.byId.get(item.id);
  const record = RECORDS.find((r) => r.id === settings.recordId)!;
  const T1 = periodFor(settings.buildingType, settings.totalFloors);
  const filling = item?.filling ?? 'even';
  const fallLen = item ? (item.mount.kind === 'wall' ? item.d + WALL_THROW * item.mount.mountHeight : item.height) : 0;

  return (
    <main style={{ boxSizing: 'border-box', padding: sp(24, 32, 48), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', columnGap: sp(32), maxWidth: 1440, margin: '0 auto', width: '100%' }}>
      <div>
        <p style={{ margin: 0, ...fs(13), fontWeight: 500, color: C.text2 }}>
          Алматы · {floorNom(settings.floor)} из {settings.totalFloors} · {points(settings.intensity)}
          {pfa7 !== null && ` · ускорение пола ${num(pfa7 * 2 ** (settings.intensity - 7), 2)} g`}
        </p>
        <h1 style={{ margin: sp(8, 0, 0), fontFamily: FONT.display, fontWeight: 500, ...fs(32), letterSpacing: LS.display }}>Как мы посчитали,<br />что упадёт</h1>
        <p style={{ margin: sp(10, 0, 0), fontFamily: FONT.display, fontStyle: 'italic', fontWeight: 500, ...fs(18), color: C.text2 }}>
          Три идеи: вес против толчка, дом раскачивает ваш этаж, шкаф падает на свою высоту.
        </p>
        <div style={{ marginTop: sp(20), borderTop: `1px solid ${C.border}` }} />

        {item && a && (
          <Section n={1} title={`Почему ${item.name.toLowerCase()} падает`}>
            <p style={body}>
              Пол дёргается вбок, а {item.name.toLowerCase()} по инерции остаётся на месте — будто его толкнули в центр масс. Вес тянет его обратно.
              Толчок слабее — качнётся и встанет. Сильнее — встанет на ребро и упадёт. Масса сокращается, вес знать не нужно.
            </p>
            <div style={{ ...card, marginTop: sp(16), padding: sp(20) }}>
              <TiltDiagram item={item} />
              <div style={{ marginTop: sp(12), paddingTop: sp(12), borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', ...small }}>
                <span>Порог опрокидывания</span>
                <span>Ваш {item.name.toLowerCase()}: {item.d} / {item.height}{filling !== 'even' && `, ${filling === 'top' ? 'тяжёлое наверху' : 'тяжёлое внизу'}`}</span>
              </div>
              <div style={{ marginTop: sp(8), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: sp(12), flexWrap: 'wrap' }}>
                <span style={{ fontFamily: FONT.display, ...fs(22) }}>
                  порог = g ×{filling === 'even' ? <Fraction top="глубина" bottom="высота" /> : <Fraction top="глубина" bottom={`2 × ${num(COM_FRACTION[filling], 1)} × высота`} />}
                </span>
                <span style={{ textAlign: 'right' }}>
                  <span style={{ display: 'block', fontFamily: FONT.display, fontWeight: 500, ...fs(44), letterSpacing: LS.number, color: C.danger }}>{a.thresholdG !== null ? `${num(a.thresholdG, 2)} g` : '—'}</span>
                  <span style={{ ...small, color: C.text }}>угол <strong>{num(tiltAngleDeg(item.d, item.height, filling))}°</strong></span>
                </span>
              </div>
              <p style={{ margin: sp(6, 0, 0), ...small }}>
                g — ускорение свободного падения. Центр масс — на {num(COM_FRACTION[filling] * 100, 0)} % высоты ({filling === 'even' ? 'заполнен равномерно' : filling === 'top' ? 'тяжёлое наверху' : 'тяжёлое внизу'}).
              </p>
            </div>
          </Section>
        )}
      </div>

      <div>
        <Section n={2} title={`Почему ${onFloor(settings.floor)} ${settings.floor > 1 ? 'опаснее' : 'спокойнее'}`}>
          <p style={body}>
            Толчок приходит в фундамент, а дом раскачивается, как высокая ветка. Мы считаем это моделью здания: {settings.totalFloors} этажей-масс
            на пружинах, затухание 5 %, на входе — настоящая запись землетрясения ({record.label}).
          </p>
          <div style={{ ...card, marginTop: sp(16), padding: sp(20) }}>
            <BuildingDiagram gains={gains} floor={settings.floor} />
            <div style={{ marginTop: sp(12), paddingTop: sp(12), borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', ...small }}>
              <span>Во сколько раз сильнее качает пол</span>
              <span>{floorNom(settings.floor)} из {settings.totalFloors}</span>
            </div>
            <div style={{ marginTop: sp(8), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: sp(12) }}>
              <p style={{ margin: 0, ...fs(14), color: C.text }}>
                Период колебаний дома T₁ = {num(T1, 2)} с<br />
                <span style={small}>ASCE 7-16, формула 12.8-7; высота этажа {num(STOREY_HEIGHT_M, 1)} м</span>
              </p>
              <span style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontFamily: FONT.display, fontWeight: 500, ...fs(26), color: C.danger }}>{gain === null ? '…' : `×${num(gain, 2)}`}</span>
                <span style={{ ...small, color: C.text }}>на 1-м — ×1</span>
              </span>
            </div>
          </div>
        </Section>

        <Section n={3} title="Баллы и ускорение">
          <p style={body}>Баллы — это сила толчка на земле. По шкале СНиП II-7-81* каждый следующий балл вдвое сильнее предыдущего:</p>
          <table style={{ marginTop: sp(12), width: '100%', borderCollapse: 'collapse', ...fs(14) }}>
            <caption style={{ position: 'absolute', left: -9999 }}>Баллы и ускорение по шкале СНиП II-7-81*</caption>
            <thead>
              <tr style={{ ...small, textAlign: 'left' }}>
                <th style={{ fontWeight: 500, padding: sp(0, 0, 6) }}>Баллы</th>
                <th style={{ fontWeight: 500, padding: sp(0, 0, 6), textAlign: 'right' }}>Ускорение грунта</th>
                <th style={{ fontWeight: 500, padding: sp(0, 0, 6), textAlign: 'right' }}>Пол {onFloor(settings.floor).replace('на ', 'на ')}</th>
              </tr>
            </thead>
            <tbody>
              {[7, 8, 9].map((I) => (
                <tr key={I} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: sp(8, 0), fontWeight: 700 }}>{I}{I === CITY_DESIGN_INTENSITY && <span style={{ ...small, fontWeight: 500 }}> · расчётная для Алматы</span>}</td>
                  <td style={{ padding: sp(8, 0), textAlign: 'right' }}>{num(intensityToAccel(I), 1)} g</td>
                  <td style={{ padding: sp(8, 0), textAlign: 'right', ...(I === CITY_DESIGN_INTENSITY ? { color: C.danger, fontWeight: 700 } : {}) }}>
                    {pfa7 === null ? '…' : `${num(pfa7 * 2 ** (I - 7), 2)} g`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {item && a && a.thresholdG !== null && a.criticalIntensity !== null && (
            <p style={{ margin: sp(12, 0, 0), ...fs(14), color: C.text, borderTop: `1px solid ${C.border}`, paddingTop: sp(12) }}>
              Чтобы {item.name.toLowerCase()} упал, хватит <strong>{num(a.thresholdG, 2)} g</strong> на полу: {onFloor(settings.floor)} это{' '}
              <strong style={{ color: C.danger }}>≈{num(a.criticalIntensity)} балла</strong>
              {!a.cascadeFrom && settings.floor !== 1 && ground !== null && `, на 1-м — ${num(criticalIntensity(a.thresholdG, ground))}`}.
            </p>
          )}
        </Section>
      </div>

      <div>
        {item && a && (
          <Section
            n={4}
            title="Куда он упадёт"
            aside={status(a) === 'falls' || a.hitsPillow || a.blocksDoor || a.hitsBed
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: sp(4), height: 24, boxSizing: 'border-box', padding: sp(0, 8), border: `1px solid ${C.danger}`, borderRadius: R.sm, ...fs(12), fontWeight: 700, color: C.danger }}><FallArrow />{tag(item, { ...a, fallsNow: true, severity: a.hitsPillow ? 4 : a.blocksDoor ? 3 : a.hitsBed ? 2 : 1 }).replace(/^./, (c) => c.toUpperCase())}</span>
              : undefined}
          >
            <p style={body}>
              {item.name} падает, поворачиваясь вокруг переднего ребра, и ложится на расстоянии своей высоты. Опасная зона — полоса длиной
              в высоту предмета: для {genitive(item.kind)} {num(fallLen / 100)} м.
            </p>
            <div style={{ ...card, marginTop: sp(16), padding: sp(12), overflow: 'hidden' }}>
              <PlanView
                room={room}
                byId={new Map([[item.id, { ...a, fallsNow: true }]])}
                selectedId={item.id}
                dispatch={dispatch}
                width={410}
                height={200}
                focus={[...a.zones.flat(), { x: item.x, y: item.y }]}
                labelSize={15}
              />
            </div>
          </Section>
        )}

        <Section n={5} title="Честно о допущениях">
          <p style={body}>Это скрининг: он показывает, что закрепить в первую очередь. Это не инженерное обследование дома.</p>
          <ul style={{ margin: sp(12, 0, 0), padding: 0, listStyle: 'none', ...fs(14) }}>
            {[
              ['Запас в осторожную сторону.', 'Порог сравниваем с самым сильным рывком пола, зону падения берём во всю высоту.'],
              ['Модель дома упрощена:', 'одинаковые этажи, период по формуле норм, дом не трескается. Толчок может прийти с любой стороны — берём худшую.'],
              ['Чего модель не видит:', 'ковёр и скользкий пол, вещи на полках, отскок от стены.'],
            ].map(([b, t]) => (
              <li key={b} style={{ display: 'flex', gap: sp(10), padding: sp(8, 0), borderTop: `1px solid ${C.border}` }}>
                <span aria-hidden="true" style={{ flex: 'none', width: 8, height: 8, marginTop: 6, borderRadius: R.full, background: C.text }} />
                <span><strong>{b}</strong> {t}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section n={6} title="Как мы проверили">
          <p style={body}>
            Две независимые модели дают один ответ: физический движок Rapier и уравнение качания Хаузнера на той же записи
            El Centro совпадают не меньше чем в 24 из 25 опытов — это автотест. Наклон, при котором падает PAX и BILLY, движок держит
            с точностью ±0,5°.
          </p>
          <a href="#physics" style={{ ...button.secondary, marginTop: sp(12), display: 'inline-flex', alignItems: 'center', gap: sp(8), boxSizing: 'border-box' }}>
            Открыть «Проверка физики» →
          </a>
        </Section>
      </div>
    </main>
  );
}
