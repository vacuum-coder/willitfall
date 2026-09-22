import { describe, it, expect } from 'vitest';
import { predictedAngle, addMeasurement, rowStats, meanError, loadExperiments, saveExperiments, MAX_ROWS, type Experiment } from './experiments';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; }, clear: () => m.clear(), getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null, removeItem: (k) => { m.delete(k); }, setItem: (k, v) => { m.set(k, String(v)); },
  };
}

describe('tilt experiments', () => {
  it('predicts arctan(B / H) for a uniform block', () => {
    expect(predictedAngle(58, 236)).toBeCloseTo(13.81, 2);
    expect(predictedAngle(10, 40)).toBeCloseTo(14.04, 2);
  });

  it('adds a measurement to the row with the same object and size, or starts a new row', () => {
    let rows: Experiment[] = [];
    rows = addMeasurement(rows, { name: 'Брусок', B: 10, H: 40 }, 14.5);
    rows = addMeasurement(rows, { name: 'Брусок', B: 10, H: 40 }, 13.5);
    rows = addMeasurement(rows, { name: 'Коробка', B: 20, H: 60 }, 18);
    expect(rows).toHaveLength(2);
    expect(rows[0].measured).toEqual([14.5, 13.5]);
  });

  it('keeps at most 10 rows', () => {
    let rows: Experiment[] = [];
    for (let k = 0; k < 12; k++) rows = addMeasurement(rows, { name: `Опыт ${k}`, B: 10 + k, H: 40 }, 15);
    expect(rows).toHaveLength(MAX_ROWS);
  });

  it('mean and relative error of a row', () => {
    const s = rowStats({ id: 'a', name: 'Брусок', B: 10, H: 40, measured: [15, 13] });
    expect(s.mean).toBe(14);
    const exact = predictedAngle(10, 40);
    expect(s.error).toBeCloseTo(Math.abs(14 - exact) / exact, 12);
    expect(rowStats({ id: 'b', name: 'x', B: 10, H: 40, measured: [] })).toEqual({ predicted: predictedAngle(10, 40), mean: null, error: null });
  });

  it('mean error over rows that have measurements', () => {
    const rows: Experiment[] = [
      { id: 'a', name: 'a', B: 10, H: 40, measured: [15.4] },
      { id: 'b', name: 'b', B: 20, H: 60, measured: [] },
    ];
    expect(meanError(rows)).toBeCloseTo(rowStats(rows[0]).error!, 12);
    expect(meanError([])).toBeNull();
  });

  it('stores only well-formed rows', () => {
    const store = memoryStorage();
    saveExperiments([{ id: 'a', name: 'Брусок', B: 10, H: 40, measured: [14] }], store);
    expect(loadExperiments(store)).toHaveLength(1);
    store.setItem('furniture-quake:experiments', '[{"id":"x","B":"oops"}]');
    expect(loadExperiments(store)).toEqual([]);
  });
});
