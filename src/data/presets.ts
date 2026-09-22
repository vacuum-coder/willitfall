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
