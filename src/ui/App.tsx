import { useEffect, useState } from 'react';
import { RoomProvider, useAssessment } from '../state/RoomContext';
import { Header, type Route } from './Header';
import { ControlsPanel } from './ControlsPanel';
import { MainPanel } from './MainPanel';
import { ItemCard } from './ItemCard';
import { Summary } from './Summary';
import { C, sp } from './ds';

function useRoute(): Route {
  const read = (): Route => {
    const h = location.hash.slice(1);
    return h === 'method' || h === 'physics' ? h : 'room';
  };
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

function RoomScreen() {
  const result = useAssessment();
  return (
    <main
      id="room"
      style={{
        boxSizing: 'border-box', padding: sp(24, 32, 28), display: 'grid',
        gridTemplateColumns: '392px minmax(480px, 552px) 384px', columnGap: sp(24), justifyContent: 'center',
      }}
    >
      <ControlsPanel result={result} />
      <MainPanel result={result} />
      <aside aria-label="Выбранный предмет и итог" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ItemCard result={result} />
        <Summary result={result} />
      </aside>
    </main>
  );
}

export function App() {
  const route = useRoute();
  return (
    <RoomProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, color: C.text }}>
        <Header route={route} />
        {route === 'room' && <RoomScreen />}
      </div>
    </RoomProvider>
  );
}
