// 3D placeholders (artboard C-States): while the 3D code loads, and when the browser cannot show 3D.

import { C, fs, sp, R, button } from './ds';

/** WebGL is available in this browser (checked once). */
let webgl: boolean | null = null;
export function hasWebGL(): boolean {
  if (webgl === null) {
    try {
      const c = document.createElement('canvas');
      webgl = !!(c.getContext('webgl2') ?? c.getContext('webgl'));
    } catch {
      webgl = false;
    }
  }
  return webgl;
}

/** «Готовим 3D…»: a quiet silhouette of the room in the scene colours. */
export function SceneLoading({ height }: { height: number }) {
  const P = (x: number, y: number, z: number) => `${250 + (x - y) * 0.866 * 40},${170 + ((x + y) / 2 - z) * 40}`;
  const poly = (pts: [number, number, number][], fill: string) => <polygon points={pts.map((p) => P(...p)).join(' ')} style={{ fill }} />;
  return (
    <div role="status" aria-live="polite" style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: sp(16) }}>
      <svg viewBox="0 0 500 320" width="60%" aria-hidden="true" style={{ opacity: 0.55 }}>
        {poly([[0, 0, 0], [0, 4.2, 0], [0, 4.2, 2.5], [0, 0, 2.5]], 'var(--scene-wall-left)')}
        {poly([[0, 0, 0], [3, 0, 0], [3, 0, 2.5], [0, 0, 2.5]], 'var(--scene-wall-back)')}
        {poly([[0, 0, 0], [3, 0, 0], [3, 4.2, 0], [0, 4.2, 0]], 'var(--scene-floor)')}
        {poly([[0.2, 0, 0.5], [1.8, 0, 0.5], [1.8, 2, 0.5], [0.2, 2, 0.5]], 'var(--scene-bed-top)')}
        {poly([[2.42, 0, 2.36], [3, 0, 2.36], [3, 1, 2.36], [2.42, 1, 2.36]], 'var(--scene-bed-top)')}
        {poly([[3, 0, 0], [3, 1, 0], [3, 1, 2.36], [3, 0, 2.36]], 'var(--scene-bed-x)')}
        {poly([[2.42, 1, 0], [3, 1, 0], [3, 1, 2.36], [2.42, 1, 2.36]], 'var(--scene-bed-y)')}
      </svg>
      <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: sp(8), ...fs(13), color: C.text2 }}>
        <span aria-hidden="true" className="spin" style={{ width: 12, height: 12, borderRadius: R.full, border: `1.5px solid ${C.borderStrong}`, borderTopColor: C.text2 }} />
        Готовим 3D…
      </p>
    </div>
  );
}

/** The browser has no WebGL (or lost it): the plan and the verdict work without 3D. */
export function SceneUnavailable({ height, onOpenPlan }: { height: number; onOpenPlan: () => void }) {
  return (
    <div role="status" style={{ height, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: sp(8), border: `1px dashed ${C.borderStrong}`, borderRadius: R.md, background: C.surface2, textAlign: 'center', padding: sp(16) }}>
      <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: R.full, border: `1px solid ${C.border}`, background: C.surface }}>
        <svg width="18" height="18" viewBox="0 0 18 18"><path d="M9 2l6 3.5v7L9 16l-6-3.5v-7z M3 5.5L9 9l6-3.5 M9 9v7 M2 2l14 14" fill="none" style={{ stroke: C.text }} strokeWidth="1.3" strokeLinejoin="round" /></svg>
      </span>
      <p style={{ margin: sp(8, 0, 0), ...fs(16), fontWeight: 500, color: C.text }}>Ваш браузер не показывает 3D.</p>
      <p style={{ margin: 0, ...fs(14), color: C.text2 }}>План и расчёт работают как обычно</p>
      <button type="button" onClick={onOpenPlan} style={{ ...button.primary, marginTop: sp(12) }}>Открыть план</button>
    </div>
  );
}
