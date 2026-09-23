// «Спальня в панельке»: 3.0 × 4.2 m (12.6 m²), ceiling 2.5 m — series 1-464 (ru.wikipedia.org/wiki/1-464).
// Layout follows the design artboard C-Desktop; furniture is real (src/data/furniture.ts).
// Plan coordinates in cm, x right, y down; vertices clockwise on screen.

import type { Item, Room, Settings } from '../physics/types';
import { product, KIND_LABEL } from './furniture';

export const CEILING_CM = 250;

const fromCatalog = (id: string, key: string, place: Pick<Item, 'x' | 'y' | 'angle'>, anchored = false): Item => {
  const p = product(key);
  return {
    id, kind: p.kind, name: KIND_LABEL[p.kind], productKey: key, w: p.w, d: p.d, height: p.height,
    ...place, mount: { kind: 'floor' }, anchored, filling: 'even',
  };
};

export const PANEL_BEDROOM: Room = {
  id: 'panel-bedroom',
  name: 'Спальня в панельке, 3,0 × 4,2 м',
  vertices: [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 420 }, { x: 0, y: 420 }],
  openings: [
    { kind: 'window', wall: 0, offset: 50, width: 100 },
    { kind: 'door', wall: 2, offset: 20, width: 80, swing: 'in-right' },
  ],
  items: [
    // 160 × 200 double bed against the window wall, pillows at the wall. Height only affects the 3D view.
    { id: 'bed', kind: 'bed', name: 'Кровать', x: 100, y: 100, w: 160, d: 200, height: 45, angle: 0, mount: { kind: 'floor' }, anchored: false, headSide: 'back' },
    fromCatalog('pax', 'ikea-pax-236', { x: 271, y: 50, angle: 90 }),
    fromCatalog('billy', 'ikea-billy', { x: 286, y: 340, angle: 90 }),
    fromCatalog('malm', 'ikea-malm-4', { x: 24, y: 310, angle: -90 }),
    fromCatalog('mirror', 'ikea-ikornnes', { x: 26, y: 231, angle: -90 }, true),
  ],
};

/** Almaty: design seismicity 9 points; the design shows the 8th floor of a 9-storey panel block. */
export const DEFAULT_SETTINGS: Settings = { floor: 8, totalFloors: 9, intensity: 9, buildingType: 'panel', recordId: 'elcentro-ns' };

const rect = (w: number, h: number) => [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];

/** Child's room 2.6 × 3.4 m: a single bed with a plasterboard shelf right above it — the case the app warns about. */
export const KIDS_ROOM: Room = {
  id: 'kids-room',
  name: 'Детская, 2,6 × 3,4 м',
  vertices: rect(260, 340),
  openings: [
    { kind: 'window', wall: 0, offset: 80, width: 100 },
    { kind: 'door', wall: 2, offset: 30, width: 80, swing: 'in-right' },
  ],
  items: [
    { id: 'bed', kind: 'bed', name: 'Кровать', x: 65, y: 105, w: 90, d: 190, height: 45, angle: 0, mount: { kind: 'floor' }, anchored: false, headSide: 'back' },
    { id: 'shelf', kind: 'wallShelf', name: 'Полка', x: 65, y: 12.5, w: 80, d: 25, height: 20, angle: 0, anchored: false,
      mount: { kind: 'wall', wall: 0, offset: 25, mountHeight: 150, fastening: 'weak' } },
    fromCatalog('billy', 'ikea-billy', { x: 246, y: 90, angle: 90 }),
    fromCatalog('malm', 'ikea-malm-4', { x: 24, y: 290, angle: -90 }),
  ],
};

/** One-room flat 3.4 × 5.0 m: the bed shares the room with the wardrobe and the bookcase. */
export const STUDIO: Room = {
  id: 'studio',
  name: 'Однушка, 3,4 × 5,0 м',
  vertices: rect(340, 500),
  openings: [
    { kind: 'window', wall: 0, offset: 110, width: 140 },
    { kind: 'door', wall: 2, offset: 40, width: 90, swing: 'in-left' },
  ],
  items: [
    { id: 'bed', kind: 'bed', name: 'Кровать', x: 120, y: 110, w: 160, d: 200, height: 45, angle: 0, mount: { kind: 'floor' }, anchored: false, headSide: 'back' },
    fromCatalog('pax', 'ikea-pax-236', { x: 311, y: 70, angle: 90 }),
    fromCatalog('hemnes', 'ikea-hemnes', { x: 18.5, y: 330, angle: -90 }),
    fromCatalog('malm', 'ikea-malm-4', { x: 120, y: 476, angle: 180 }),
    fromCatalog('mirror', 'ikea-ikornnes', { x: 314, y: 300, angle: 90 }, true),
  ],
};

/** Dormitory room 2.4 × 4.2 m: two beds along the walls and a shared bookcase. */
export const DORM: Room = {
  id: 'dorm',
  name: 'Общежитие, 2,4 × 4,2 м',
  vertices: rect(240, 420),
  openings: [
    { kind: 'window', wall: 0, offset: 70, width: 100 },
    { kind: 'door', wall: 2, offset: 25, width: 80, swing: 'in-right' },
  ],
  items: [
    { id: 'bed', kind: 'bed', name: 'Кровать', x: 45, y: 115, w: 90, d: 190, height: 45, angle: 0, mount: { kind: 'floor' }, anchored: false, headSide: 'back' },
    { id: 'bed2', kind: 'bed', name: 'Вторая кровать', x: 195, y: 115, w: 90, d: 190, height: 45, angle: 0, mount: { kind: 'floor' }, anchored: false, headSide: 'back' },
    fromCatalog('billy', 'ikea-billy', { x: 120, y: 274, angle: 180 }),
    fromCatalog('malm', 'ikea-malm-4', { x: 24, y: 380, angle: -90 }),
  ],
};

export const ROOM_PRESETS: { label: string; room: Room }[] = [
  { label: 'Спальня в панельке', room: PANEL_BEDROOM },
  { label: 'Детская', room: KIDS_ROOM },
  { label: 'Однушка', room: STUDIO },
  { label: 'Общежитие', room: DORM },
];
