// Data model shared by the physics core, state and UI (spec, «Модель данных»).
// Plan coordinates in centimetres, x right, y down; angles in degrees, clockwise on screen.

import type { Vec, Side } from './geometry';
import type { Filling } from './tipping';

export type Fastening = 'anchor' | 'weak' | 'unknown';

export type Mount =
  | { kind: 'floor' }
  | { kind: 'onItem'; supportId: string }
  | { kind: 'wall'; wall: number; offset: number; mountHeight: number; fastening: Fastening };

export type FurnitureKind =
  | 'bed' | 'wardrobe' | 'wallUnit' | 'bookshelf' | 'dresser' | 'nightstand'
  | 'fridge' | 'mirror' | 'tv' | 'wallShelf' | 'picture' | 'vase';

export interface Item {
  id: string;
  kind: FurnitureKind;
  name: string;
  x: number;
  y: number;
  w: number;
  d: number;
  height: number;
  angle: number;
  mount: Mount;
  anchored: boolean;
  filling?: Filling;
  /** Catalogue product the size came from (src/data/furniture.ts); absent for the user's own measurements. */
  productKey?: string;
  /** Only for beds: the side where the pillow is. */
  headSide?: Side;
}

export interface Opening {
  kind: 'door' | 'window';
  wall: number;
  offset: number;
  width: number;
  swing?: 'in-left' | 'in-right' | 'out-left' | 'out-right';
}

export interface Room {
  id: string;
  name: string;
  vertices: Vec[];
  openings: Opening[];
  items: Item[];
}

export type BuildingType = 'panel' | 'brick' | 'monolith';

export interface Settings {
  floor: number;
  totalFloors: number;
  intensity: number;
  buildingType: BuildingType;
  recordId: string;
}

export type Mode = 'tips' | 'slides' | 'anchored' | 'blocked' | 'wallFalls' | 'wallSafe';

export interface ItemAssessment {
  itemId: string;
  mode: Mode;
  thresholdG: number | null;
  criticalIntensity: number | null;
  fallsNow: boolean;
  cascadeFrom?: string;
  /** Sides the item tips over (the governing directions). */
  sides: Side[];
  zones: Vec[][];
  hitsWall: boolean;
  hitsBed: boolean;
  hitsPillow: boolean;
  blocksDoor: boolean;
  /** 4 pillow, 3 exit, 2 bed, 1 falls, 0 safe — only while fallsNow. */
  severity: 0 | 1 | 2 | 3 | 4;
}
