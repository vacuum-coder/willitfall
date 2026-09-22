// Runs «Тряхнуть» in a worker and plays the recorded simulation back at ×1 or ×0.5.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ShakeRequest, ShakeResponse, ShakeResult } from '../physics/sim/shake.worker';
import type { SimItem, SimWall } from '../physics/sim/world';
import { COM_FRACTION } from '../physics/tipping';
import { supportTop, WALL_TEAR_OFF_G } from '../physics/assess';
import { wallFrames } from '../state/placement';
import { periodFor } from '../data/buildings';
import type { ItemAssessment, Room, Settings } from '../physics/types';

export interface Pose { x: number; y: number; z: number; qx: number; qy: number; qz: number; qw: number }
export type QuakeState =
  | { phase: 'idle' }
  | { phase: 'computing' }
  | { phase: 'playing' | 'done'; result: ShakeResult; t: number; speed: number }
  | { phase: 'error'; message: string };

const M = (cm: number) => cm / 100;

export function toSimItems(room: Room): SimItem[] {
  return room.items.map((i) => {
    const base = {
      id: i.id, x: M(i.x), z: M(i.y), w: M(i.w), d: M(i.d), H: M(i.height), angleDeg: i.angle,
      comH: M(i.height) * COM_FRACTION[i.filling ?? 'even'],
    };
    if (i.mount.kind === 'wall') {
      // Hung on the wall at its mounting height; weak or unknown fastening tears off at WALL_TEAR_OFF_G (assumption).
      const strong = i.anchored || i.mount.fastening === 'anchor';
      return { ...base, comH: M(i.height) / 2, y0: M(i.mount.mountHeight), anchored: strong, ...(strong ? {} : { releaseG: WALL_TEAR_OFF_G }) };
    }
    // The bed is too low and wide to tip; it moves with the room as an obstacle, like anchored furniture.
    return { ...base, anchored: i.anchored || i.kind === 'bed', y0: M(supportTop(i, room)) };
  });
}

export function toSimWalls(room: Room): SimWall[] {
  return wallFrames(room.vertices).map((f) => ({ ax: M(f.a.x), az: M(f.a.y), bx: M(f.b.x), bz: M(f.b.y), nx: f.inward.x, nz: f.inward.y }));
}

/** Shaking axis: the tipping direction of the most dangerous item (spec: «худшая для самого опасного предмета»). */
export function worstDirection(room: Room, checklist: ItemAssessment[]): { x: number; y: number } {
  const top = checklist.find((a) => a.sides.length && room.items.find((i) => i.id === a.itemId)?.mount.kind !== 'wall');
  const item = top && room.items.find((i) => i.id === top.itemId);
  if (!top || !item) return { x: 1, y: 0 };
  const r = (item.angle * Math.PI) / 180, side = top.sides[0];
  const u = { x: Math.cos(r), y: Math.sin(r) }, n = { x: -Math.sin(r), y: Math.cos(r) };
  return side === 'front' || side === 'back' ? n : u;
}

export function poseAt(result: ShakeResult, id: string, t: number): Pose | null {
  const arr = result.poses.find(([k]) => k === id)?.[1];
  if (!arr) return null;
  const frames = arr.length / 7, f = Math.min(frames - 1, Math.max(0, Math.round(t / result.frameDt)));
  const o = f * 7;
  return { x: arr[o], y: arr[o + 1], z: arr[o + 2], qx: arr[o + 3], qy: arr[o + 4], qz: arr[o + 5], qw: arr[o + 6] };
}

export function floorAt(result: ShakeResult, t: number): { x: number; z: number } {
  const frames = result.floor.length / 2, f = Math.min(frames - 1, Math.max(0, Math.round(t / result.frameDt)));
  return { x: result.floor[f * 2], z: result.floor[f * 2 + 1] };
}

export const duration = (r: ShakeResult) => (r.floor.length / 2 - 1) * r.frameDt;

export function useQuake(room: Room, settings: Settings, checklist: ItemAssessment[]) {
  const [state, setState] = useState<QuakeState>({ phase: 'idle' });
  const worker = useRef<Worker | null>(null);
  const raf = useRef(0);

  useEffect(() => () => { worker.current?.terminate(); cancelAnimationFrame(raf.current); }, []);

  const play = useCallback((result: ShakeResult, speed: number) => {
    cancelAnimationFrame(raf.current);
    const start = performance.now(), total = duration(result);
    const tick = () => {
      const t = Math.min(total, ((performance.now() - start) / 1000) * speed);
      setState({ phase: t >= total ? 'done' : 'playing', result, t, speed });
      if (t < total) raf.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const shake = useCallback(() => {
    worker.current?.terminate();
    cancelAnimationFrame(raf.current);
    const w = new Worker(new URL('../physics/sim/shake.worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    setState({ phase: 'computing' });
    w.onmessage = (e: MessageEvent<ShakeResponse>) => {
      w.terminate();
      if (!e.data.ok) { setState({ phase: 'error', message: e.data.error }); return; }
      play(e.data.result, 1);
    };
    w.onerror = (e) => {
      w.terminate();
      setState({ phase: 'error', message: e.message || 'расчёт тряски не запустился' });
    };
    const req: ShakeRequest = {
      recordId: settings.recordId, base: import.meta.env.BASE_URL, intensity: settings.intensity,
      storeys: settings.totalFloors, T1: periodFor(settings.buildingType, settings.totalFloors), floor: settings.floor,
      items: toSimItems(room), walls: toSimWalls(room), dir: worstDirection(room, checklist),
    };
    w.postMessage(req);
  }, [room, settings, checklist, play]);

  const replay = useCallback((speed: number) => {
    if (state.phase === 'playing' || state.phase === 'done') play(state.result, speed);
  }, [state, play]);

  const reset = useCallback(() => {
    worker.current?.terminate();
    cancelAnimationFrame(raf.current);
    setState({ phase: 'idle' });
  }, []);

  return { state, shake, replay, reset };
}

