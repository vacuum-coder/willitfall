// Right column, bottom (C-Desktop «Итог при N баллах»): counts and the checklist by danger.

import { useState } from 'react';
import { button, C, FONT, fs, R, sp } from './ds';
import { num, plural, countPhrase } from './format';
import { status, tag, advice, summaryCounts } from './verdict';
import { useRoom, type RoomAssessment } from '../state/RoomContext';

const TONE = { falls: C.danger, slides: C.slide, safe: C.safe, stands: C.text2 } as const;

/** «при 9 баллах», «при 8,5 балла» */
const atPoints = (I: number) =>
  Number.isInteger(I) ? `${I} ${plural(I, ['балле', 'баллах', 'баллах'])}` : `${num(I)} балла`;

export function Summary({ result }: { result: RoomAssessment }) {
  const { state, dispatch } = useRoom();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const items = result.checklist
    .map((a) => ({ a, item: state.room.items.find((i) => i.id === a.itemId)! }))
    .filter(({ item }) => item && item.kind !== 'bed');
  const counts = summaryCounts(items.map(({ a }) => a));
  const bedId = state.room.items.find((i) => i.kind === 'bed')?.id;
  const overBed = items.filter(({ a }) => a.overBed && a.fallsNow);
  const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
  const parts = [
    counts.falls > 0 && <strong key="f" style={{ fontWeight: 700, color: C.danger }}>{countPhrase(counts.falls, 'falls')}</strong>,
    counts.slides > 0 && <strong key="s" style={{ fontWeight: 700, color: C.slide }}>{countPhrase(counts.slides, 'slides')}</strong>,
    counts.safe > 0 && <strong key="a" style={{ fontWeight: 700, color: C.safe }}>{countPhrase(counts.safe, 'anchored')}</strong>,
  ].filter(Boolean);

  return (
    <section id="summary" aria-labelledby="h-sum" style={{ marginTop: sp(24) }}>
      <h2 id="h-sum" style={{ margin: 0, fontFamily: FONT.display, fontWeight: 500, ...fs(22) }}>Итог при {atPoints(state.settings.intensity)}</h2>
      <p style={{ margin: sp(6, 0, 0), ...fs(14), color: C.text }}>
        {result.peak.status !== 'ready' ? 'Считаем…' : parts.length ? parts.flatMap((p, k) => (k ? [' · ', p] : [p])) : 'Ничего не упадёт'}
      </p>
      {overBed.length > 0 && (
        <p role="alert" style={{ margin: sp(12, 0, 0), padding: sp(10, 12), border: `1px solid ${C.danger}`, borderRadius: R.md, background: C.dangerTint, ...fs(13), fontWeight: 700, color: C.danger }}>
          {overBed.length > 1 ? 'Над кроватью висят' : 'Над кроватью висит'} {overBed.map(({ item }) => lower(item.name)).join(', ')} — {overBed.length > 1 ? 'они упадут' : 'она упадёт'} прямо на спящего, тут не поможет даже поворот кровати.
        </p>
      )}

      {result.safeSpot && (
        <div style={{ marginTop: sp(12), padding: sp(10, 12), border: `1px solid ${C.safe}`, borderRadius: R.md, background: C.safeTint }}>
          <p style={{ margin: 0, ...fs(13), fontWeight: 700, color: C.text }}>Кровать стоит в зоне падения</p>
          <p style={{ margin: sp(2, 0, 8), ...fs(13), color: C.text }}>
            Есть место, куда ничего не упадёт — {num(result.safeSpot.moved / 100)} м от нынешнего, показано на плане.
          </p>
          <button
            type="button"
            onClick={() => dispatch({ type: 'PLACE_AT', id: bedId!, x: result.safeSpot!.x, y: result.safeSpot!.y, angle: result.safeSpot!.angle })}
            style={{ ...button.secondary, width: '100%' }}
          >
            Переставить кровать сюда
          </button>
        </div>
      )}

      <p style={{ margin: sp(12, 0, 4), ...fs(12), fontWeight: 600, color: C.text2 }}>Что сделать — по порядку опасности</p>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map(({ a, item }, k) => {
          const st = status(a), quiet = st === 'safe';
          const id = `todo-${item.id}`;
          return (
            <li
              key={item.id}
              style={{
                display: 'grid', gridTemplateColumns: '22px 1fr 18px', columnGap: sp(10), alignItems: 'start', padding: sp(8, 0),
                borderTop: `1px solid ${C.border}`, ...(k === items.length - 1 ? { borderBottom: `1px solid ${C.border}` } : {}),
              }}
            >
              <span style={{ marginTop: -2, fontFamily: FONT.display, fontStyle: 'italic', fontWeight: 500, ...fs(18), color: quiet ? C.text2 : C.text }}>{k + 1}</span>
              <label htmlFor={id} style={{ display: 'flex', flexDirection: 'column', gap: sp(2), cursor: 'pointer' }} onMouseEnter={() => undefined}>
                <span style={{ ...fs(14), fontWeight: 700, ...(quiet ? { color: C.text2 } : {}) }}>
                  <button type="button" onClick={() => dispatch({ type: 'SELECT_ITEM', id: item.id })} style={{ padding: 0, border: 0, background: 'transparent', font: 'inherit', color: 'inherit', cursor: 'pointer' }}>{item.name}</button>{' '}
                  <span style={{ fontWeight: 600, color: TONE[st] }}>— {tag(item, a)}</span>
                </span>
                <span style={{ ...fs(13), color: quiet ? C.text2 : C.text }}>{advice(item, a)}</span>
              </label>
              <input id={id} className="chk" type="checkbox" checked={quiet || !!done[item.id]} onChange={(e) => setDone({ ...done, [item.id]: e.target.checked })} />
            </li>
          );
        })}
      </ol>
      <p style={{ margin: sp(10, 0, 0), ...fs(12), color: C.text2 }}>Скрининг по упрощённой физике, не заменяет инженерное обследование.</p>
    </section>
  );
}
