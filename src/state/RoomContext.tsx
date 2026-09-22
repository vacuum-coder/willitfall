// App state provider: reducer + browser storage + engine results derived from the state.

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { roomReducer, initialState, type Action, type AppState } from './roomReducer';
import { loadState, saveState } from './storage';
import { PANEL_BEDROOM } from '../data/presets';
import { periodFor } from '../data/buildings';
import { assessRoom } from '../physics/assess';
import type { FloorPeakRequest, FloorPeakResponse } from '../physics/floorPeak.worker';
import type { ItemAssessment, Settings } from '../physics/types';

interface Ctx { state: AppState; dispatch: Dispatch<Action> }
const RoomCtx = createContext<Ctx | null>(null);

function init(): AppState {
  const saved = loadState();
  return saved ? { ...initialState(saved.room, saved.settings), nextId: saved.nextId, walls: saved.walls } : initialState(PANEL_BEDROOM);
}

export function RoomProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(roomReducer, undefined, init);
  useEffect(() => saveState(state), [state]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <RoomCtx.Provider value={value}>{children}</RoomCtx.Provider>;
}

export function useRoom(): Ctx {
  const ctx = useContext(RoomCtx);
  if (!ctx) throw new Error('useRoom outside RoomProvider');
  return ctx;
}

export type Peak = { status: 'loading' } | { status: 'ready'; pfa7G: number } | { status: 'error'; message: string };

const peakKey = (s: Settings, floor: number) => `${s.recordId}|${s.buildingType}|${s.totalFloors}|${floor}`;

/** Peak floor acceleration at 7 points for the given floors of the current building and record (worker, cached). */
export function useFloorPeaks(settings: Settings, floors: number[]): Map<number, Peak> {
  const [worker, setWorker] = useState<Worker | null>(null);
  const results = useRef(new Map<string, Peak>());
  const sent = useRef(new Set<string>());
  const [, rerender] = useState(0);

  useEffect(() => {
    const w = new Worker(new URL('../physics/floorPeak.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<FloorPeakResponse>) => {
      const r = e.data;
      results.current.set(r.key, 'error' in r ? { status: 'error', message: r.error } : { status: 'ready', pfa7G: r.pfa7G });
      rerender((n) => n + 1);
    };
    // A new worker has none of the earlier requests: everything not yet answered is sent again.
    sent.current = new Set();
    setWorker(w);
    return () => w.terminate();
  }, []);

  const wanted = floors.join(',');
  useEffect(() => {
    if (!worker) return;
    for (const floor of wanted.split(',').map(Number)) {
      const key = peakKey(settings, floor);
      if (results.current.has(key) || sent.current.has(key)) continue;
      sent.current.add(key);
      const req: FloorPeakRequest = {
        key, recordId: settings.recordId, storeys: settings.totalFloors,
        T1: periodFor(settings.buildingType, settings.totalFloors), floor, base: import.meta.env.BASE_URL,
      };
      worker.postMessage(req);
    }
  }, [wanted, settings, worker]);

  return new Map(floors.map((f) => [f, results.current.get(peakKey(settings, f)) ?? { status: 'loading' as const }]));
}

/** Peak floor acceleration at 7 points for the current floor. */
export function useFloorPeak(settings: Settings): Peak {
  return useFloorPeaks(settings, [settings.floor]).get(settings.floor)!;
}

export interface RoomAssessment {
  peak: Peak;
  /** Peak at 7 points on the ground floor, the same way (the reference for «×N» and «на 1-м этаже»). */
  peak1: number | null;
  assessments: ItemAssessment[];
  checklist: ItemAssessment[];
  byId: Map<string, ItemAssessment>;
}

/** Engine verdict for every item at the current settings; empty until the floor peak is ready. */
export function useAssessment(): RoomAssessment {
  const { state } = useRoom();
  const peaks = useFloorPeaks(state.settings, [state.settings.floor, 1]);
  const peak = peaks.get(state.settings.floor)!;
  const ground = peaks.get(1)!;
  const peak1 = ground.status === 'ready' ? ground.pfa7G : null;
  return useMemo(() => {
    if (peak.status !== 'ready') return { peak, peak1, assessments: [], checklist: [], byId: new Map() };
    const { assessments, checklist } = assessRoom(state.room, state.settings, { pfa7G: peak.pfa7G });
    return { peak, peak1, assessments, checklist, byId: new Map(assessments.map((a) => [a.itemId, a])) };
  }, [peak, peak1, state.room, state.settings]);
}
