import { C, FONT, fs, sp, selectStyle } from './ds';
import { Chevron, Logo } from './icons';
import { useRoom } from '../state/RoomContext';
import { RECORDS } from '../data/records';

export type Route = 'room' | 'method' | 'physics';

const TABS: { route: Route; label: string }[] = [
  { route: 'room', label: 'Комната' },
  { route: 'method', label: 'Как посчитано' },
  { route: 'physics', label: 'Проверка физики' },
];

export function Header({ route }: { route: Route }) {
  const { state, dispatch } = useRoom();
  return (
    <header style={{ height: 64, flex: 'none', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: sp(48), padding: sp(0, 32), borderBottom: `1px solid ${C.border}` }}>
      <a href="#room" aria-label="[Название] — проверка спальни на землетрясение" style={{ display: 'flex', alignItems: 'center', gap: sp(12), color: C.text }}>
        <Logo />
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: FONT.display, fontWeight: 600, ...fs(18) }}>[Название]</span>
          <span style={{ ...fs(13), color: C.text2 }}>проверка спальни на землетрясение</span>
        </span>
      </a>
      <nav aria-label="Разделы" style={{ display: 'flex', alignSelf: 'stretch', gap: sp(32) }}>
        {TABS.map((t) => {
          const current = t.route === route;
          return (
            <a
              key={t.route}
              href={`#${t.route}`}
              aria-current={current ? 'page' : undefined}
              style={{
                display: 'flex', alignItems: 'center', height: 63, boxSizing: 'border-box', paddingTop: sp(2),
                borderBottom: `2px solid ${current ? C.danger : 'transparent'}`, ...fs(14),
                fontWeight: current ? 700 : 500, color: current ? C.text : C.text2,
              }}
            >
              {t.label}
            </a>
          );
        })}
      </nav>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: sp(24) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: sp(10) }}>
          <label htmlFor="record" style={{ ...fs(13), color: C.text2 }}>Запись</label>
          <div style={{ position: 'relative' }}>
            <select
              id="record"
              value={state.settings.recordId}
              onChange={(e) => dispatch({ type: 'SET_RECORD', id: e.target.value })}
              style={selectStyle}
            >
              {RECORDS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <Chevron />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: sp(10) }}>
          <label htmlFor="city" style={{ ...fs(13), color: C.text2 }}>Город</label>
          <div style={{ position: 'relative' }}>
            <select id="city" style={selectStyle} defaultValue="almaty">
              <option value="almaty">Алматы</option>
            </select>
            <Chevron />
          </div>
        </div>
      </div>
    </header>
  );
}
