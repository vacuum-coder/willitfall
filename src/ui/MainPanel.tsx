// Centre column of C-Desktop: context line, headline, the 3D card with «Тряхнуть».

import { lazy, Suspense, useMemo, useState } from 'react';
import { C, FONT, fs, sp, R, H, LS, SH, card, button } from './ds';
import { LegendAnchored, LegendFalls, LegendSlides, Shake } from './icons';
import { floorNom, num, points } from './format';
import { headline, status } from './verdict';
import { useRoom, type RoomAssessment } from '../state/RoomContext';
import { CITY_DESIGN_INTENSITY } from '../data/records';
import { useQuake, poseAt, floorAt, duration, type Pose } from '../three/useQuake';
import type { CameraPreset } from '../three/Scene3D';

const Scene3D = lazy(() => import('../three/Scene3D'));

const CAMERAS: { value: CameraPreset; label: string }[] = [
  { value: 'overview', label: 'Обзор' },
  { value: 'top', label: 'Сверху' },
  { value: 'pillow', label: 'С подушки' },
];

export function MainPanel({ result }: { result: RoomAssessment }) {
  const { state, dispatch } = useRoom();
  const { settings, room } = state;
  const [camera, setCamera] = useState<CameraPreset>('overview');
  const quake = useQuake(room, settings, result.checklist);
  const q = quake.state;
  const pfa7 = result.peak.status === 'ready' ? result.peak.pfa7G : null;
  const floorAccel = pfa7 === null ? null : pfa7 * 2 ** (settings.intensity - 7);

  const playback = q.phase === 'playing' || q.phase === 'done' ? q : null;
  const poses = useMemo(() => {
    if (!playback) return null;
    const m = new Map<string, Pose>();
    for (const [id] of playback.result.poses) { const p = poseAt(playback.result, id, playback.t); if (p) m.set(id, p); }
    return m;
  }, [playback]);
  const floorOffset = playback ? floorAt(playback.result, playback.t) : undefined;

  const walls = !!state.walls;
  const hazards = room.items.filter((i) => i.kind !== 'bed' && i.mount.kind !== 'wall');
  const simFell = playback?.phase === 'done' ? playback.result.outcomes.filter((o) => o.result === 'fell' && hazards.some((i) => i.id === o.id)).length : null;
  const formulaFalls = result.assessments.filter((a) => status(a) === 'falls' && hazards.some((i) => i.id === a.itemId)).length;

  return (
    <section aria-labelledby="h-main" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <p style={{ margin: 0, ...fs(13), fontWeight: 500, color: C.text2 }}>
        Алматы · {floorNom(settings.floor)} из {settings.totalFloors} · {points(settings.intensity)}
        {floorAccel !== null && ` · ускорение пола ${num(floorAccel, 2)} g`}
      </p>
      <h1 id="h-main" style={{ margin: sp(8, 0, 0), fontFamily: FONT.display, fontWeight: 500, ...fs(32), letterSpacing: LS.display, color: C.text, whiteSpace: 'nowrap' }}>
        {walls ? 'Форма комнаты' : 'Что упадёт, пока вы спите'}
      </h1>
      <p style={{ margin: sp(10, 0, 0), maxWidth: 520, minHeight: 48, fontFamily: FONT.display, fontStyle: 'italic', fontWeight: 500, ...fs(18), color: C.text2 }}>
        {walls ? 'Тяните углы на плане — стены в 3D перестраиваются сразу. Мебель вернётся на место, когда нажмёте «Готово».'
          : result.peak.status === 'ready'
          ? headline(room.items, result.assessments, settings.intensity === CITY_DESIGN_INTENSITY)
          : result.peak.status === 'error' ? `Не удалось загрузить запись: ${result.peak.message}` : 'Считаем, как качается ваш этаж…'}
      </p>

      <div style={{ ...card, marginTop: sp(20), height: 640, boxSizing: 'border-box', padding: sp(16), display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 32, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: sp(14) }}>
            <h2 style={{ margin: 0, fontFamily: FONT.display, fontWeight: 600, ...fs(18) }}>3D</h2>
            <div role="group" aria-label="Камера" style={{ display: 'flex', height: H.md, boxSizing: 'border-box', padding: sp(2), border: `1px solid ${C.border}`, borderRadius: R.md, background: C.bg }}>
              {CAMERAS.map((c) => {
                const on = c.value === camera;
                return (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setCamera(c.value)}
                    style={{ height: '100%', padding: sp(0, 10), border: 0, borderRadius: R.md, background: on ? C.surface : 'transparent', boxShadow: on ? SH[1] : 'none', ...fs(13), fontWeight: on ? 700 : 500, color: on ? C.text : C.text2 }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
          <ul aria-label="Легенда" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: sp(12), ...fs(12), color: C.text }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: sp(6) }}><LegendFalls />упадёт</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: sp(6) }}><LegendSlides />сдвинется</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: sp(6) }}><LegendAnchored />закреплён</li>
          </ul>
        </div>

        <div style={{ marginTop: sp(12), height: 510, flex: 'none', position: 'relative' }}>
          <Suspense fallback={<p style={{ margin: 0, ...fs(14), color: C.text2 }}>Загружаем 3D…</p>}>
            <Scene3D
              room={room}
              byId={result.byId}
              selectedId={state.selectedId}
              dispatch={dispatch}
              preset={camera}
              poses={poses}
              floorOffset={floorOffset}
              width={518}
              height={510}
            />
          </Suspense>
          {q.phase === 'computing' && (
            <p role="status" style={{ position: 'absolute', left: 0, bottom: 0, margin: 0, padding: sp(6, 10), borderRadius: R.md, background: C.surface, boxShadow: SH[2], ...fs(13), color: C.text }}>
              Считаем колебания здания и физику мебели…
            </p>
          )}
          {playback && (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, borderRadius: R.xs, background: C.border }}>
              <div style={{ width: `${(playback.t / duration(playback.result)) * 100}%`, height: '100%', borderRadius: R.xs, background: C.danger }} />
            </div>
          )}
        </div>

        {walls ? (
          <div style={{ marginTop: sp(12), height: 40, flex: 'none', display: 'flex', alignItems: 'center', gap: sp(8) }}>
            <button type="button" onClick={() => dispatch({ type: 'END_WALLS' })} style={{ ...button.primary, display: 'flex', alignItems: 'center', gap: sp(8) }}>✓ Готово — к мебели</button>
            <button type="button" onClick={() => dispatch({ type: 'RESET_SHAPE' })} style={button.secondary}>Сбросить форму</button>
            <p style={{ margin: 0, marginLeft: 'auto', ...fs(12), color: C.text2, textAlign: 'right' }}>Мебель скрыта,<br />пока вы правите стены</p>
          </div>
        ) : (
        <div style={{ marginTop: sp(12), height: 40, flex: 'none', display: 'flex', alignItems: 'center', gap: sp(8) }}>
          <button type="button" onClick={quake.shake} disabled={q.phase === 'computing' || pfa7 === null} style={{ ...button.primary, display: 'flex', alignItems: 'center', gap: sp(8) }}>
            <Shake />Тряхнуть · {points(settings.intensity)}
          </button>
          {playback ? (
            <>
              <button type="button" onClick={() => quake.replay(0.5)} style={button.secondary}>Повтор ×0,5</button>
              <button type="button" onClick={quake.reset} style={button.secondary}>Сбросить</button>
            </>
          ) : (
            <button type="button" onClick={quake.reset} style={button.secondary}>Сбросить</button>
          )}
          <p style={{ margin: 0, marginLeft: 'auto', ...fs(12), color: C.text2, textAlign: 'right' }}>
            {simFell !== null
              ? <>В симуляции упало {simFell} из {hazards.length},<br />по формуле — {formulaFalls}</>
              : q.phase === 'error' ? `Ошибка: ${q.message}`
              : playback ? <>Трясём: самые сильные<br />10 секунд записи</>
              : <>Решает формула,<br />показывает физический движок</>}
          </p>
        </div>
        )}
      </div>
    </section>
  );
}
