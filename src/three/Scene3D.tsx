// 3D view (C-Desktop «3D»): the same room state as the plan, isometric like the artboard.
// World: metres, y up; plan (x, y) cm → world (x / 100, 0, y / 100).

import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, PerspectiveCamera, Html, Line, Edges } from '@react-three/drei';
import { useEffect, useMemo, useRef, type Dispatch } from 'react';
import { BoxGeometry, CanvasTexture, DoubleSide, MeshBasicMaterial, Plane, RepeatWrapping, Shape, Vector3 } from 'three';
import { token, tokenAlpha, FACES, type Faces } from './sceneColors';
import { CEILING_CM } from '../data/presets';
import { wallFrames } from '../state/placement';
import { doorZone, type Vec } from '../physics/geometry';
import { supportTop } from '../physics/assess';
import { status, type Status } from '../ui/verdict';
import { num } from '../ui/format';
import { C, fs, sp, R } from '../ui/ds';
import type { Action } from '../state/roomReducer';
import type { Item, ItemAssessment, Room } from '../physics/types';
import type { Pose } from './useQuake';

export type CameraPreset = 'overview' | 'top' | 'pillow';

const M = (cm: number) => cm / 100;
const W3 = (v: Vec) => new Vector3(M(v.x), 0, M(v.y));

function faceMaterials(f: Faces): MeshBasicMaterial[] {
  const top = new MeshBasicMaterial({ color: token(f.top) });
  const x = new MeshBasicMaterial({ color: token(f.x) });
  const z = new MeshBasicMaterial({ color: token(f.z) });
  // BoxGeometry groups: +x, −x, +y, −y, +z, −z.
  return [x, x, top, top, z, z];
}

function Box({ size, position, faces, rotationY = 0 }: { size: [number, number, number]; position: [number, number, number]; faces: Faces; rotationY?: number }) {
  const geometry = useMemo(() => new BoxGeometry(...size), [size[0], size[1], size[2]]); // eslint-disable-line react-hooks/exhaustive-deps
  const materials = useMemo(() => faceMaterials(faces), [faces]);
  return (
    <mesh geometry={geometry} material={materials} position={position} rotation={[0, rotationY, 0]}>
      <Edges color={token(faces.stroke)} lineWidth={1} />
    </mesh>
  );
}

function hatchTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  g.strokeStyle = `#${token('--c-danger').getHexString()}`;
  g.globalAlpha = 0.45;
  g.lineWidth = 3;
  for (let k = -32; k <= 64; k += 12) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 32, 32); g.stroke(); }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(8, 8);
  return t;
}

function FloorPolygon({ points, y, color, opacity = 1, map }: { points: Vec[]; y: number; color: string; opacity?: number; map?: CanvasTexture }) {
  const shape = useMemo(() => new Shape(points.map((p) => W3(p)).map((v) => ({ x: v.x, y: v.z }) as never)), [points]);
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial color={token(color)} transparent={opacity < 1 || !!map} opacity={opacity} map={map ?? null} side={DoubleSide} depthWrite={false} />
    </mesh>
  );
}

const outline = (p: Vec[], y: number) => [...p, p[0]].map((v) => [M(v.x), y, M(v.y)] as [number, number, number]);

/** Plank lines every 30 cm across the floor polygon. */
function planks(v: Vec[]): [Vec, Vec][] {
  const xs = v.map((p) => p.x), out: [Vec, Vec][] = [];
  for (let x = Math.min(...xs) + 30; x < Math.max(...xs); x += 30) {
    const hits: number[] = [];
    v.forEach((a, i) => {
      const b = v[(i + 1) % v.length];
      if ((a.x - x) * (b.x - x) < 0) hits.push(a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y));
    });
    hits.sort((p, q) => p - q);
    for (let k = 0; k + 1 < hits.length; k += 2) out.push([{ x, y: hits[k] }, { x, y: hits[k + 1] }]);
  }
  return out;
}

function RoomShell({ room }: { room: Room }) {
  const frames = wallFrames(room.vertices);
  const H = M(CEILING_CM), T = 0.12;
  // Walls whose inside faces the camera (the far walls) are drawn; the near ones are cut away.
  const far = frames.map((f, i) => ({ f, i })).filter(({ f }) => f.inward.x + f.inward.y > 0.1);
  return (
    <group>
      <FloorPolygon points={room.vertices} y={0} color="--scene-floor" />
      {planks(room.vertices).map(([a, b], k) => (
        <Line key={k} points={[[M(a.x), 0.001, M(a.y)], [M(b.x), 0.001, M(b.y)]]} color={token('--scene-floor-line')} lineWidth={0.6} />
      ))}
      {far.map(({ f, i }) => {
        const len = M(f.len), mid = W3({ x: (f.a.x + f.b.x) / 2, y: (f.a.y + f.b.y) / 2 });
        const angle = -Math.atan2(f.t.y, f.t.x);
        const color = Math.abs(f.inward.x) > Math.abs(f.inward.y) ? '--scene-wall-left' : '--scene-wall-back';
        const windows = room.openings.filter((o) => o.kind === 'window' && o.wall === i);
        return (
          <group key={i} position={[mid.x, 0, mid.z]} rotation={[0, angle, 0]}>
            <mesh position={[0, H / 2, 0]}>
              <planeGeometry args={[len, H]} />
              <meshBasicMaterial color={token(color)} side={DoubleSide} />
            </mesh>
            <mesh position={[0, H + 0.001, -T / 2]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[len + T, T]} />
              <meshBasicMaterial color={token('--scene-poche')} side={DoubleSide} />
            </mesh>
            {windows.map((o, k) => {
              const cx = M(o.offset + o.width / 2) - len / 2;
              return (
                <group key={k}>
                  <mesh position={[cx, 1.6, 0.002]}>
                    <planeGeometry args={[M(o.width), 1.2]} />
                    <meshBasicMaterial color={token('--scene-window')} side={DoubleSide} />
                  </mesh>
                  <Line points={[[cx - M(o.width) / 2, 1.0, 0.003], [cx + M(o.width) / 2, 1.0, 0.003], [cx + M(o.width) / 2, 2.2, 0.003], [cx - M(o.width) / 2, 2.2, 0.003], [cx - M(o.width) / 2, 1.0, 0.003]]} color={token('--scene-ink')} lineWidth={0.7} />
                  <Line points={[[cx, 1.0, 0.003], [cx, 2.2, 0.003]]} color={token('--scene-ink')} lineWidth={0.6} />
                </group>
              );
            })}
          </group>
        );
      })}
      <Line points={outline(room.vertices, 0.002)} color={token('--scene-floor-ao')} lineWidth={1.5} />
    </group>
  );
}

const statusFaces = (st: Status, dangerIndex: number): Faces =>
  st === 'falls' ? (dangerIndex === 0 ? FACES.falls : FACES.falls2) : FACES[st];

function Bed({ item }: { item: Item }) {
  // Layers from the artboard: frame 32 cm, mattress to 52, blanket and pillow on top; headboard 95 cm at the head.
  const turn = { back: 0, front: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 }[item.headSide ?? 'back'];
  const side = Math.abs(turn) === Math.PI / 2;
  const W = M(side ? item.d : item.w), D = M(side ? item.w : item.d);
  return (
    <group position={[M(item.x), 0, M(item.y)]} rotation={[0, -(item.angle * Math.PI) / 180 - turn, 0]}>
      <Box size={[W, 0.95, 0.06]} position={[0, 0.475, -D / 2 + 0.03]} faces={FACES.bedhead} />
      <Box size={[W, 0.32, D - 0.06]} position={[0, 0.16, 0.03]} faces={FACES.bed} />
      <Box size={[W - 0.08, 0.2, D - 0.1]} position={[0, 0.42, 0.03]} faces={FACES.mattress} />
      <Box size={[W - 0.08, 0.04, D - 0.76]} position={[0, 0.54, 0.34]} faces={FACES.blanket} />
      <Box size={[W - 0.36, 0.12, 0.38]} position={[0, 0.58, -D / 2 + 0.31]} faces={FACES.pillow} />
    </group>
  );
}

interface SceneProps {
  room: Room;
  byId: Map<string, ItemAssessment>;
  selectedId: string | null;
  dispatch: Dispatch<Action>;
  preset: CameraPreset;
  poses: Map<string, Pose> | null;
  /** Floor displacement during playback, metres. */
  floorOffset?: { x: number; z: number };
  width: number;
  height: number;
  /** Called when the browser drops the WebGL context. */
  onLost?: () => void;
}

function Furniture({ item, a, dangerIndex, selected, pose, onPointerDown }: {
  item: Item; a?: ItemAssessment; dangerIndex: number; selected: boolean; pose?: Pose; onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const st = a ? status(a) : 'stands';
  const base = item.mount.kind === 'wall' ? M(item.mount.mountHeight) : 0;
  const lift = pose ? 0 : base + M(extraLift(item));
  const H = M(item.height);
  const position: [number, number, number] = pose ? [pose.x, pose.y, pose.z] : [M(item.x), lift + H / 2, M(item.y)];
  return (
    <group position={position} quaternion={pose ? [pose.qx, pose.qy, pose.qz, pose.qw] : undefined} rotation={pose ? undefined : [0, -(item.angle * Math.PI) / 180, 0]} onPointerDown={onPointerDown}>
      <Box size={[M(item.w), H, M(item.d)]} position={[0, 0, 0]} faces={statusFaces(st, dangerIndex)} />
      {selected && !pose && (
        <Line points={[[-M(item.w) / 2 - 0.05, -H / 2 + 0.003, -M(item.d) / 2 - 0.05], [M(item.w) / 2 + 0.05, -H / 2 + 0.003, -M(item.d) / 2 - 0.05], [M(item.w) / 2 + 0.05, -H / 2 + 0.003, M(item.d) / 2 + 0.05], [-M(item.w) / 2 - 0.05, -H / 2 + 0.003, M(item.d) / 2 + 0.05], [-M(item.w) / 2 - 0.05, -H / 2 + 0.003, -M(item.d) / 2 - 0.05]]} color={token('--scene-ink')} lineWidth={1.2} dashed dashSize={0.05} gapSize={0.04} />
      )}
    </group>
  );
}

let liftRoom: Room | null = null;
const extraLift = (item: Item) => (liftRoom ? supportTop(item, liftRoom) : 0);

function Zones({ room, byId }: { room: Room; byId: Map<string, ItemAssessment> }) {
  const hatch = useMemo(hatchTexture, []);
  return (
    <group>
      {room.items.flatMap((i) => {
        const a = byId.get(i.id);
        if (!a || status(a) !== 'falls') return [];
        return a.zones.map((z, k) => (
          <group key={`${i.id}${k}`}>
            <FloorPolygon points={z} y={0.003} color="--c-danger-zone" opacity={tokenAlpha('--c-danger-zone')} />
            <FloorPolygon points={z} y={0.004} color="--c-danger" opacity={1} map={hatch} />
            <Line points={outline(z, 0.005)} color={token('--c-danger')} lineWidth={1} dashed dashSize={0.08} gapSize={0.05} />
          </group>
        ));
      })}
      {room.openings.filter((o) => o.kind === 'door').map((o, k) => (
        <Line key={`d${k}`} points={outline(doorZone(room.vertices, o), 0.005)} color={token('--c-safe')} lineWidth={1.1} dashed dashSize={0.05} gapSize={0.05} />
      ))}
    </group>
  );
}

function Callouts({ room, byId }: { room: Room; byId: Map<string, ItemAssessment> }) {
  return (
    <>
      {room.items.filter((i) => i.kind !== 'bed').map((i) => {
        const a = byId.get(i.id);
        if (!a) return null;
        const st = status(a);
        const tone = { falls: C.danger, slides: C.slide, safe: C.safe, stands: C.text2 }[st];
        const text = st === 'falls' || (st === 'stands' && a.criticalIntensity !== null)
          ? num(Math.min(a.criticalIntensity ?? 10, 10)) : st === 'slides' ? 'сдвинется' : st === 'safe' ? 'закреплено' : 'устоит';
        const top = M(i.height) + (i.mount.kind === 'wall' ? M(i.mount.mountHeight) : M(extraLift(i)));
        return (
          <Html key={i.id} position={[M(i.x), top + 0.12, M(i.y)]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <span style={{ display: 'inline-block', whiteSpace: 'nowrap', padding: sp(2, 6), borderRadius: R.sm, background: C.surface, boxShadow: 'var(--sh-2)', ...fs(12), fontWeight: 700, color: C.text }}>
              {i.name} · <span style={{ color: tone }}>{text}</span>
            </span>
          </Html>
        );
      })}
    </>
  );
}

/** Camera rigs: isometric overview as in the artboard, straight down, and from the pillow. */
function Cameras({ preset, room }: { preset: CameraPreset; room: Room }) {
  const xs = room.vertices.map((v) => v.x), ys = room.vertices.map((v) => v.y);
  const cx = M((Math.min(...xs) + Math.max(...xs)) / 2), cz = M((Math.min(...ys) + Math.max(...ys)) / 2);
  const bed = room.items.find((i) => i.kind === 'bed');
  const controls = useRef<never>(null);
  const { size } = useThree();
  // An orthographic zoom Z shows each axis at Z·√(2/3) px/m. The artboard uses 64 px/m; smaller canvases
  // fit the room's isometric footprint: width (W + D)·cos30°, height (W + D)/2 + ceiling.
  const W = M(Math.max(...xs) - Math.min(...xs)), D = M(Math.max(...ys) - Math.min(...ys)), k = Math.sqrt(2 / 3);
  const isoZoom = Math.min(
    64 / k,
    (size.width * 0.9) / ((W + D) * Math.cos(Math.PI / 6) * k),
    (size.height * 0.85) / (((W + D) / 2 + M(CEILING_CM)) * k),
  );
  const target: [number, number, number] = [cx, M(CEILING_CM) * 0.3, cz];

  if (preset === 'pillow' && bed) {
    // Direction from the bed centre to its head, in plan coordinates.
    const a = (bed.angle * Math.PI) / 180;
    const u = { x: Math.cos(a), y: Math.sin(a) }, n = { x: -Math.sin(a), y: Math.cos(a) };
    const side = bed.headSide ?? 'back';
    const dir = side === 'back' ? { x: -n.x, y: -n.y } : side === 'front' ? n : side === 'left' ? { x: -u.x, y: -u.y } : u;
    const half = side === 'back' || side === 'front' ? bed.d / 2 : bed.w / 2;
    const head = { x: bed.x + dir.x * (half - 30), y: bed.y + dir.y * (half - 30) };
    const eye: [number, number, number] = [M(head.x), 0.7, M(head.y)];
    const look: [number, number, number] = [M(head.x - dir.x * 200), 1.0, M(head.y - dir.y * 200)];
    return (
      <>
        <PerspectiveCamera makeDefault position={eye} fov={70} near={0.05} far={50} />
        <OrbitControls ref={controls} target={look} enablePan={false} makeDefault />
      </>
    );
  }
  const dist = 20;
  const position: [number, number, number] = preset === 'top'
    ? [cx, dist, cz + 0.0001]
    : [target[0] + dist, target[1] + dist, target[2] + dist];
  return (
    <>
      <OrthographicCamera key={preset} makeDefault position={position} zoom={preset === 'top' ? isoZoom * 0.95 : isoZoom} near={0.1} far={100} />
      <OrbitControls
        key={`c-${preset}`}
        ref={controls}
        target={preset === 'top' ? [cx, 0, cz] : target}
        enableRotate
        maxPolarAngle={Math.PI / 2 - 0.05}
        minZoom={20}
        maxZoom={400}
        makeDefault
      />
    </>
  );
}

/** Dragging furniture across the floor with a ray on the floor plane; the camera stops orbiting meanwhile. */
function useFloorDrag(dispatch: Dispatch<Action>) {
  const { camera, raycaster, pointer, controls, gl } = useThree();
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  const state = useRef<{ id: string; grab: Vector3; start: Item } | null>(null);

  useEffect(() => {
    const el = gl.domElement;
    const hit = () => {
      raycaster.setFromCamera(pointer, camera);
      const p = new Vector3();
      return raycaster.ray.intersectPlane(plane, p) ? p : null;
    };
    const move = () => {
      const s = state.current;
      const p = s && hit();
      if (!s || !p) return;
      dispatch({ type: 'MOVE_ITEM', id: s.id, x: s.start.x + (p.x - s.grab.x) * 100, y: s.start.y + (p.z - s.grab.z) * 100 });
    };
    const up = () => {
      if (!state.current) return;
      state.current = null;
      if (controls) (controls as unknown as { enabled: boolean }).enabled = true;
    };
    el.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { el.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [camera, raycaster, pointer, controls, gl, plane, dispatch]);

  return (item: Item) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    dispatch({ type: 'SELECT_ITEM', id: item.id });
    const p = new Vector3();
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.ray.intersectPlane(plane, p)) return;
    state.current = { id: item.id, grab: p, start: item };
    if (controls) (controls as unknown as { enabled: boolean }).enabled = false;
  };
}

function Contents({ room, byId, selectedId, dispatch, preset, poses, floorOffset }: Omit<SceneProps, 'width' | 'height' | 'onLost'>) {
  liftRoom = room;
  const startDrag = useFloorDrag(dispatch);
  const dangerIndex = new Map<string, number>();
  room.items.forEach((i) => { const a = byId.get(i.id); if (a && status(a) === 'falls') dangerIndex.set(i.id, dangerIndex.size); });
  const furniture = (i: Item) => (
    <Furniture
      key={i.id}
      item={i}
      a={byId.get(i.id)}
      dangerIndex={dangerIndex.get(i.id) ?? 0}
      selected={i.id === selectedId}
      pose={poses?.get(i.id)}
      onPointerDown={poses ? () => undefined : startDrag(i)}
    />
  );
  const others = room.items.filter((i) => i.kind !== 'bed');
  return (
    <>
      <Cameras preset={preset} room={room} />
      {/* Everything fixed to the building moves with the floor during playback. */}
      <group position={[floorOffset?.x ?? 0, 0, floorOffset?.z ?? 0]}>
        <RoomShell room={room} />
        {!poses && <Zones room={room} byId={byId} />}
        {room.items.filter((i) => i.kind === 'bed').map((b) => <Bed key={b.id} item={b} />)}
        {others.filter((i) => !poses?.has(i.id)).map(furniture)}
      </group>
      {others.filter((i) => poses?.has(i.id)).map(furniture)}
      {!poses && <Callouts room={room} byId={byId} />}
    </>
  );
}

export default function Scene3D(props: SceneProps) {
  return (
    <Canvas
      orthographic
      flat
      dpr={[1, 2]}
      style={{ width: props.width, height: props.height, background: 'transparent' }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', () => props.onLost?.())}
      onPointerMissed={() => props.dispatch({ type: 'SELECT_ITEM', id: null })}
    >
      <Contents {...props} />
    </Canvas>
  );
}
