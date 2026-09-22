import { describe, it, expect } from 'vitest';
import { loadState, saveState, STORAGE_KEY } from './storage';
import { initialState, roomReducer } from './roomReducer';
import { PANEL_BEDROOM } from '../data/presets';

/** In-memory stand-in for window.localStorage (Node has none). */
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => { m.delete(k); },
    setItem: (k, v) => { m.set(k, String(v)); },
  };
}

describe('storage', () => {
  it('round-trips the room and settings', () => {
    const store = memoryStorage();
    const s = roomReducer(initialState(PANEL_BEDROOM), { type: 'SET_INTENSITY', value: 8.4 });
    saveState(s, store);
    const back = loadState(store);
    expect(back?.room).toEqual(s.room);
    expect(back?.settings.intensity).toBe(8.4);
  });

  it('ignores broken JSON, a foreign schema version and a missing key', () => {
    const store = memoryStorage();
    expect(loadState(store)).toBeNull();
    store.setItem(STORAGE_KEY, '{not json');
    expect(loadState(store)).toBeNull();
    store.setItem(STORAGE_KEY, JSON.stringify({ version: 999, room: PANEL_BEDROOM }));
    expect(loadState(store)).toBeNull();
    store.setItem(STORAGE_KEY, JSON.stringify({ version: 1, room: { vertices: [] }, settings: {} }));
    expect(loadState(store)).toBeNull();
  });

  it('survives a storage that throws (private mode)', () => {
    const throwing = { ...memoryStorage(), getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } } as Storage;
    expect(loadState(throwing)).toBeNull();
    expect(() => saveState(initialState(PANEL_BEDROOM), throwing)).not.toThrow();
  });
});
