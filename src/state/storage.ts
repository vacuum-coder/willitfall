// The plan lives only in the user's browser (spec, «Данные и безопасность»). Nothing is sent anywhere.

import type { Room, Settings } from '../physics/types';
import type { AppState } from './roomReducer';

export const STORAGE_KEY = 'furniture-quake:room';
export const SCHEMA_VERSION = 1;

interface Saved { version: number; room: Room; settings: Settings; nextId: number; walls?: AppState['walls'] }

const isVec = (v: unknown) => !!v && typeof (v as { x: unknown }).x === 'number' && typeof (v as { y: unknown }).y === 'number';

function isSaved(x: unknown): x is Saved {
  const s = x as Partial<Saved>;
  return (
    !!s && s.version === SCHEMA_VERSION &&
    !!s.room && Array.isArray(s.room.vertices) && s.room.vertices.length >= 3 && s.room.vertices.every(isVec) &&
    Array.isArray(s.room.items) && Array.isArray(s.room.openings) &&
    !!s.settings && typeof s.settings.intensity === 'number' && typeof s.settings.floor === 'number' &&
    typeof s.settings.totalFloors === 'number' && typeof s.settings.recordId === 'string' &&
    typeof s.nextId === 'number'
  );
}

/** Saved room and settings, or null when there is nothing usable (then the app starts from the preset). */
export function loadState(store: Storage | undefined = globalThis.localStorage): Pick<AppState, 'room' | 'settings' | 'nextId' | 'walls'> | null {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSaved(parsed) ? { room: parsed.room, settings: parsed.settings, nextId: parsed.nextId, walls: parsed.walls ?? null } : null;
  } catch {
    return null;
  }
}

export function saveState(s: AppState, store: Storage | undefined = globalThis.localStorage): void {
  try {
    const saved: Saved = { version: SCHEMA_VERSION, room: s.room, settings: s.settings, nextId: s.nextId, walls: s.walls };
    store?.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Private mode or a full quota: the app keeps working, the plan just is not remembered.
  }
}

export function clearState(store: Storage | undefined = globalThis.localStorage): void {
  try {
    store?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
