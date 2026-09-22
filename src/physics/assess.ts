// Per-item and per-room screening (spec, «Алгоритм assessItem»).
// The floor's peak acceleration comes from the shear-building model driven by a real record;
// the model is linear, so the peak at intensity I is PFA₇ · 2^(I − 7) and I_crit = 7 + log₂(a_crit / PFA₇).

import { G } from './units';
import { intensityToAccel } from './intensity';
import { resample, scaleToPeak, peakAbs, type GroundRecord } from './record';
import { floorResponse, type Building } from './building';
import { tipThresholdG, slidesFirst, DEFAULT_MU } from './tipping';
import {
  roomWalls, sideTouchesWall, zonePolygon, itemPolygon, polyIntersects, pillowZone, doorZone,
  type Side, type Vec,
} from './geometry';
import type { Item, Room, Settings, ItemAssessment, Mode } from './types';

/** Newmark step for the building model, s. */
export const BUILDING_DT = 0.001;
/** Wall items on weak or unknown fastening tear off at this floor acceleration — an assumption, not a calculation. */
export const WALL_TEAR_OFF_G = 0.3;
/** Share of the mounting height a falling wall item is thrown forward. */
export const WALL_THROW = 0.5;

const SIDES: Side[] = ['front', 'back', 'left', 'right'];

export interface AssessContext {
  /** Peak floor acceleration at 7 points on the chosen floor, g. */
  pfa7G: number;
  mu?: number;
}

/** Peak absolute acceleration of `floor` (g) when the record is scaled to 0.1 g at the ground. */
export function peakFloorAccelAt7(record: GroundRecord, building: Building, floor: number): number {
  const t = Array.from(record.accelG, (_, i) => i * record.dt);
  const ag = resample(t, Array.from(scaleToPeak(record.accelG, intensityToAccel(7))), BUILDING_DT).map((a) => a * G);
  return peakAbs(floorResponse(building, ag, BUILDING_DT, floor).accel) / G;
}

export const criticalIntensity = (thresholdG: number, pfa7G: number): number => 7 + Math.log2(thresholdG / pfa7G);

export function detectBlockedSides(item: Item, room: Room): Side[] {
  const walls = roomWalls(room.vertices);
  return SIDES.filter((s) => sideTouchesWall(item, s, walls));
}

/** Lowest threshold over the open directions; ties within 1e-9 give several sides. */
function governing(item: Item, open: Side[]): { thresholdG: number; sides: Side[] } {
  const dirs = open.map((side) => ({
    side,
    t: tipThresholdG(side === 'front' || side === 'back' ? item.d : item.w, item.height, item.filling ?? 'even'),
  }));
  const thresholdG = Math.min(...dirs.map((x) => x.t));
  return { thresholdG, sides: dirs.filter((x) => x.t - thresholdG <= 1e-9).map((x) => x.side) };
}

const supportOf = (item: Item, room: Room): Item | undefined =>
  item.mount.kind === 'onItem' ? room.items.find((i) => i.id === (item.mount as { supportId: string }).supportId) : undefined;

/** Height of the surface the item stands on, cm (stacks add up). */
export function supportTop(item: Item, room: Room, seen = new Set<string>()): number {
  const s = supportOf(item, room);
  if (!s || seen.has(s.id)) return 0;
  seen.add(item.id);
  return s.height + supportTop(s, room, seen);
}

export function assessItem(
  item: Item, room: Room, settings: Settings, ctx: AssessContext, seen = new Set<string>(),
): ItemAssessment {
  const done = (mode: Mode, x: Partial<ItemAssessment> = {}): ItemAssessment => {
    const zones = x.zones ?? [];
    const beds = room.items.filter((i) => i.kind === 'bed' && i.id !== item.id);
    const doors = room.openings.filter((o) => o.kind === 'door').map((o) => doorZone(room.vertices, o));
    const hit = (targets: Vec[][]) => zones.some((z) => targets.some((t) => polyIntersects(z, t)));
    const hitsPillow = hit(beds.map((b) => pillowZone(b, b.headSide ?? 'back')));
    const blocksDoor = hit(doors);
    const hitsBed = hit(beds.map(itemPolygon));
    const fallsNow = x.fallsNow ?? false;
    const severity = !fallsNow ? 0 : hitsPillow ? 4 : blocksDoor ? 3 : hitsBed ? 2 : 1;
    return {
      itemId: item.id, mode, thresholdG: null, criticalIntensity: null, sides: [], hitsWall: false,
      slideIntensity: null, slidesNow: false,
      ...x, zones, fallsNow, hitsPillow, blocksDoor, hitsBed, severity,
    };
  };

  if (item.anchored) return done('anchored');

  if (item.mount.kind === 'wall') {
    if (item.mount.fastening === 'anchor') return done('wallSafe');
    const Icrit = criticalIntensity(WALL_TEAR_OFF_G, ctx.pfa7G);
    const z = zonePolygon(item, 'front', item.d + WALL_THROW * item.mount.mountHeight, room.vertices, -item.d);
    return done('wallFalls', {
      thresholdG: WALL_TEAR_OFF_G, criticalIntensity: Icrit, fallsNow: settings.intensity >= Icrit,
      sides: ['front'], zones: [z.poly], hitsWall: z.hitsWall,
    });
  }

  const blocked = detectBlockedSides(item, room);
  const open = SIDES.filter((s) => !blocked.includes(s));
  let mode: Mode = 'blocked', thresholdG: number | null = null, Icrit: number | null = null, sides: Side[] = [];
  let slideIntensity: number | null = null;
  const mu = ctx.mu ?? DEFAULT_MU;
  if (open.length > 0) {
    const g = governing(item, open);
    ({ thresholdG, sides } = g);
    if (slidesFirst(g.thresholdG, mu)) {
      mode = 'slides';
      // Friction holds until the floor pushes harder than μ·g.
      slideIntensity = criticalIntensity(mu, ctx.pfa7G);
    }
    else {
      mode = 'tips';
      Icrit = criticalIntensity(g.thresholdG, ctx.pfa7G);
    }
  }

  // Cascade: whatever stands on a falling support falls with it.
  const support = supportOf(item, room);
  const sup = support && !seen.has(support.id)
    ? assessItem(support, room, settings, ctx, new Set([...seen, item.id]))
    : undefined;
  const supI = sup?.criticalIntensity ?? null;
  let cascadeFrom: string | undefined;
  if (supI !== null && (Icrit === null || supI < Icrit)) {
    Icrit = supI;
    cascadeFrom = support!.id;
  }
  const slide = { slideIntensity, slidesNow: slideIntensity !== null && settings.intensity >= slideIntensity };
  if (Icrit === null) return done(mode, { thresholdG, sides, ...slide });

  // Falling from a support reaches further: zone length = own height + height of the surface.
  const own = sides.map((s) => zonePolygon(item, s, item.height + supportTop(item, room), room.vertices));
  const zones = [...(supI !== null ? sup!.zones : []), ...own.map((z) => z.poly)];
  return done(mode, {
    thresholdG, criticalIntensity: Icrit, fallsNow: settings.intensity >= Icrit, cascadeFrom, sides,
    zones, hitsWall: own.some((z) => z.hitsWall), ...slide,
  });
}

/** Assessments for every item and the checklist: severity descending, then critical intensity ascending. */
export function assessRoom(room: Room, settings: Settings, ctx: AssessContext) {
  const assessments = room.items.map((i) => assessItem(i, room, settings, ctx));
  const rank = (a: ItemAssessment) => a.criticalIntensity ?? Number.POSITIVE_INFINITY;
  const checklist = [...assessments].sort((a, b) => {
    if (a.severity !== b.severity) return b.severity - a.severity;
    const ra = rank(a), rb = rank(b);
    return ra === rb ? 0 : ra < rb ? -1 : 1;
  });
  return { assessments, checklist };
}
