// Runs the «Тряхнуть» pipeline (shake.ts) off the main thread.

import { loadRecord } from '../record';
import { runShake, type ShakeRequest, type ShakeResponse } from './shake';

export type { ShakeRequest, ShakeResponse, ShakeResult } from './shake';

self.onmessage = async (e: MessageEvent<ShakeRequest>) => {
  try {
    const { recordId, base, ...q } = e.data;
    const result = await runShake(await loadRecord(recordId, base), q);
    (self as unknown as Worker).postMessage({ ok: true, result } satisfies ShakeResponse, [result.floor.buffer, ...result.poses.map(([, p]) => p.buffer)]);
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) } satisfies ShakeResponse);
  }
};
