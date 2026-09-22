// Runs the building model off the main thread: a 6-minute record at a 1 ms step takes ~0.3 s per floor.

import { loadRecord } from './record';
import { makeBuilding } from './building';
import { peakFloorAccelAt7 } from './assess';

export interface FloorPeakRequest { key: string; recordId: string; storeys: number; T1: number; floor: number; base: string }
export type FloorPeakResponse = { key: string; pfa7G: number } | { key: string; error: string };

const records = new Map<string, ReturnType<typeof loadRecord>>();

self.onmessage = async (e: MessageEvent<FloorPeakRequest>) => {
  const { key, recordId, storeys, T1, floor, base } = e.data;
  try {
    if (!records.has(recordId)) records.set(recordId, loadRecord(recordId, base));
    const record = await records.get(recordId)!;
    const pfa7G = peakFloorAccelAt7(record, makeBuilding(storeys, T1), floor);
    self.postMessage({ key, pfa7G } satisfies FloorPeakResponse);
  } catch (err) {
    records.delete(recordId);
    self.postMessage({ key, error: err instanceof Error ? err.message : String(err) } satisfies FloorPeakResponse);
  }
};
