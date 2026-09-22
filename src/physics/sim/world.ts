// Headless Rapier world — the same engine and parameters the 3D view uses (spec, «Параметры симуляции»).
// Metres and seconds, y up. Plan coordinates map to the world as (x, y_plan) → (x, z).
// The floor is a kinematic body driven by position; walls and anchored items are colliders on it,
// so they move with the room. Everything else is a dynamic cuboid that only feels the floor
// through contact and friction, as in reality.

import RAPIER from '@dimforge/rapier3d-compat';
import { G } from '../units';
import { resample, baselineCorrect, integrate } from '../record';

export const SIM_DT = 1 / 240;
export const SOLVER_ITERATIONS = 8;
export const DEFAULT_FRICTION = 0.4;
export const DEFAULT_RESTITUTION = 0.05;
/** Seconds the items rest on the still floor before the shaking starts. */
export const SETTLE_S = 0.5;
/** Seconds after the record ends, so rocking items finish falling or come to rest. */
export const AFTERMATH_S = 3;

export interface SimItem {
  id: string;
  /** Centre on the floor, metres (world x and z). */
  x: number;
  z: number;
  /** Width along the item's local x, depth along its local z, height. */
  w: number;
  d: number;
  H: number;
  /** Rotation about the vertical, degrees clockwise on the plan. */
  angleDeg: number;
  /** Height of the centre of mass above the floor. */
  comH: number;
  anchored: boolean;
  /** Height of the surface it stands on (another item's top), metres; 0 on the floor. */
  y0?: number;
}

/** A wall segment; (nx, nz) points into the room, so the wall's thickness is built outside the room. */
export interface SimWall { ax: number; az: number; bx: number; bz: number; nx?: number; nz?: number }

export interface SimOutcome {
  id: string;
  result: 'fell' | 'slid' | 'stood';
  maxTiltDeg: number;
  finalPos: { x: number; z: number };
}

/** Poses sampled for playback: per frame the floor offset and, for every dynamic item, x y z qx qy qz qw. */
export interface SimFrames {
  dt: number;
  floor: Float32Array; // [dx, dz] per frame
  poses: Map<string, Float32Array>; // 7 numbers per frame
}

export interface SimOptions {
  items: SimItem[];
  /** Floor displacement along `dir`, metres, sampled every `dt` seconds. */
  floorDisp: Float64Array;
  dt: number;
  /** Shaking direction on the plan (x, y_plan); normalised internally. */
  dir: { x: number; y: number };
  walls?: SimWall[];
  mu?: number;
  restitution?: number;
  gravity?: { x: number; y: number; z: number };
  /** Called after every step with the time since the shaking started and each item's tilt, degrees. */
  trace?: (t: number, tiltsDeg: number[]) => void;
}

const FELL_DEG = 45;
const SLID_M = 0.05;
const SLID_MAX_TILT_DEG = 10;
const WALL_THICKNESS = 0.1;
const WALL_HEIGHT = 3;

let ready: Promise<void> | null = null;
const init = () => (ready ??= RAPIER.init());

/** Rotation about the vertical: clockwise on the plan (y down) is a negative turn about world y. */
function yaw(angleDeg: number): RAPIER.Rotation {
  const h = (-angleDeg * Math.PI) / 360;
  return { x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) };
}

const tiltDeg = (q: RAPIER.Rotation): number =>
  (Math.acos(Math.max(-1, Math.min(1, 1 - 2 * (q.x * q.x + q.z * q.z)))) * 180) / Math.PI;

/**
 * Ground or floor acceleration (m/s²) → floor motion at the simulation step:
 * resampled, baseline-corrected (no drift), integrated twice.
 */
export function floorMotion(accel: Float64Array, dt: number): { accel: Float64Array; disp: Float64Array } {
  const t = Array.from(accel, (_, i) => i * dt);
  const a = baselineCorrect(resample(t, Array.from(accel), SIM_DT), SIM_DT);
  const { vel, disp } = integrate(a, SIM_DT);
  // Second stage: subtract p(t) = c2·t² + c3·t³ from the displacement so the floor also ends at rest where it
  // started (p(0) = p'(0) = 0 keeps the start untouched). The same correction, p''(t), is taken off the acceleration.
  const n = disp.length, T = (n - 1) * SIM_DT, D = disp[n - 1], V = vel[n - 1];
  const c3 = (V * T - 2 * D) / T ** 3, c2 = (3 * D - V * T) / T ** 2;
  for (let i = 0; i < n; i++) {
    const s = i * SIM_DT;
    disp[i] -= c2 * s * s + c3 * s ** 3;
    a[i] -= 2 * c2 + 6 * c3 * s;
  }
  return { accel: a, disp };
}

export async function simulateRoom(opts: SimOptions): Promise<SimOutcome[]> {
  return (await runSimulation(opts, 0)).outcomes;
}

/** Same simulation, also recording every `every`-th step for the 3D playback (4 → 60 frames per second). */
export async function simulateRoomRecorded(opts: SimOptions, every = 4): Promise<{ outcomes: SimOutcome[]; frames: SimFrames }> {
  const r = await runSimulation(opts, every);
  return { outcomes: r.outcomes, frames: r.frames! };
}

async function runSimulation(opts: SimOptions, every: number): Promise<{ outcomes: SimOutcome[]; frames: SimFrames | null }> {
  await init();
  const mu = opts.mu ?? DEFAULT_FRICTION;
  const restitution = opts.restitution ?? DEFAULT_RESTITUTION;
  const len = Math.hypot(opts.dir.x, opts.dir.y);
  const dir = { x: opts.dir.x / len, z: opts.dir.y / len };

  const world = new RAPIER.World(opts.gravity ?? { x: 0, y: -G, z: 0 });
  try {
    world.timestep = SIM_DT;
    world.numSolverIterations = SOLVER_ITERATIONS;

    const floor = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
    const fixture = (desc: RAPIER.ColliderDesc) =>
      world.createCollider(desc.setFriction(mu).setRestitution(restitution), floor);
    fixture(RAPIER.ColliderDesc.cuboid(200, 0.5, 200).setTranslation(0, -0.5, 0));
    for (const w of opts.walls ?? []) {
      const lenW = Math.hypot(w.bx - w.ax, w.bz - w.az);
      // The collider's inner face lies on the wall line: furniture standing flush against it is not pushed away.
      const out = WALL_THICKNESS / 2;
      fixture(
        RAPIER.ColliderDesc.cuboid(lenW / 2, WALL_HEIGHT / 2, WALL_THICKNESS / 2)
          .setTranslation((w.ax + w.bx) / 2 - (w.nx ?? 0) * out, WALL_HEIGHT / 2, (w.az + w.bz) / 2 - (w.nz ?? 0) * out)
          .setRotation(yaw((Math.atan2(w.bz - w.az, w.bx - w.ax) * 180) / Math.PI)),
      );
    }

    const bodies = opts.items.map((it) => {
      const box = RAPIER.ColliderDesc.cuboid(it.w / 2, it.H / 2, it.d / 2);
      if (it.anchored) {
        fixture(box.setTranslation(it.x, (it.y0 ?? 0) + it.H / 2, it.z).setRotation(yaw(it.angleDeg)));
        return null;
      }
      // Mass is irrelevant for tipping (it cancels); it only sets the solver's scale. 300 kg/m³ ≈ a loaded cabinet.
      const m = 300 * it.w * it.d * it.H;
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(it.x, (it.y0 ?? 0) + it.H / 2, it.z)
          .setRotation(yaw(it.angleDeg))
          .setCanSleep(false)
          .setCcdEnabled(true)
          .setAdditionalMassProperties(
            m,
            { x: 0, y: it.comH - it.H / 2, z: 0 },
            { x: (m / 12) * (it.H ** 2 + it.d ** 2), y: (m / 12) * (it.w ** 2 + it.d ** 2), z: (m / 12) * (it.w ** 2 + it.H ** 2) },
            { x: 0, y: 0, z: 0, w: 1 },
          ),
      );
      world.createCollider(box.setDensity(0).setFriction(mu).setRestitution(restitution), body);
      return body;
    });

    const n = opts.floorDisp.length;
    // After the record the floor keeps its last velocity: stopping it dead would be a spurious jolt.
    const vEnd = n > 1 ? (opts.floorDisp[n - 1] - opts.floorDisp[n - 2]) / opts.dt : 0;
    const dispAt = (t: number) => {
      const x = t / opts.dt;
      if (x <= 0) return 0;
      if (x >= n - 1) return opts.floorDisp[n - 1] + vEnd * (t - (n - 1) * opts.dt);
      const i = Math.floor(x);
      return opts.floorDisp[i] + (x - i) * (opts.floorDisp[i + 1] - opts.floorDisp[i]);
    };
    const settle = Math.round(SETTLE_S / SIM_DT);
    const steps = settle + Math.ceil(((n - 1) * opts.dt) / SIM_DT) + Math.round(AFTERMATH_S / SIM_DT);
    const maxTilt = bodies.map(() => 0);
    // Travel is measured from where each item rests once settled, not from where it was created.
    let start = bodies.map((b) => (b ? { ...b.translation() } : null));
    const recorded = every > 0 ? Math.floor((steps - settle) / every) + 1 : 0;
    const frames: SimFrames | null = every > 0
      ? { dt: every * SIM_DT, floor: new Float32Array(recorded * 2), poses: new Map(opts.items.flatMap((it, i) => (bodies[i] ? [[it.id, new Float32Array(recorded * 7)]] : []))) }
      : null;
    const capture = (s: number, u: number) => {
      if (!frames || s < settle || (s - settle) % every !== 0) return;
      const f = (s - settle) / every;
      frames.floor[f * 2] = dir.x * u;
      frames.floor[f * 2 + 1] = dir.z * u;
      opts.items.forEach((it, i) => {
        const b = bodies[i];
        if (!b) return;
        const p = b.translation(), q = b.rotation(), arr = frames.poses.get(it.id)!;
        arr.set([p.x, p.y, p.z, q.x, q.y, q.z, q.w], f * 7);
      });
    };
    capture(settle, 0);

    for (let s = 1; s <= steps; s++) {
      const u = dispAt((s - settle) * SIM_DT);
      floor.setNextKinematicTranslation({ x: dir.x * u, y: 0, z: dir.z * u });
      world.step();
      const tilts = bodies.map((b) => (b ? tiltDeg(b.rotation()) : 0));
      tilts.forEach((v, i) => { maxTilt[i] = Math.max(maxTilt[i], v); });
      opts.trace?.((s - settle) * SIM_DT, tilts);
      capture(s, u);
      if (s === settle) start = bodies.map((b) => (b ? { ...b.translation() } : null));
    }

    const uEnd = dispAt((steps - settle) * SIM_DT);
    const outcomes: SimOutcome[] = opts.items.map((it, i) => {
      const b = bodies[i];
      if (!b) return { id: it.id, result: 'stood', maxTiltDeg: 0, finalPos: { x: it.x + dir.x * uEnd, z: it.z + dir.z * uEnd } };
      const p = b.translation(), tilt = tiltDeg(b.rotation());
      const travel = Math.hypot(p.x - start[i]!.x - dir.x * uEnd, p.z - start[i]!.z - dir.z * uEnd);
      const result = tilt > FELL_DEG ? 'fell' : travel > SLID_M && tilt < SLID_MAX_TILT_DEG ? 'slid' : 'stood';
      return { id: it.id, result, maxTiltDeg: maxTilt[i], finalPos: { x: p.x, z: p.z } };
    });
    return { outcomes, frames };
  } finally {
    world.free();
  }
}
