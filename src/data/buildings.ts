// Fundamental period of the building, ASCE 7-16 Eq. 12.8-7: Ta = Ct · hn^x, with Ct and x from Table 12.8-2.
// hn = storeys × STOREY_HEIGHT_M.

import type { BuildingType } from '../physics/types';

/** Floor-to-floor height — an assumption for Soviet-era residential series (ceilings 2.5–2.55 m plus the slab). */
export const STOREY_HEIGHT_M = 2.8;

export const PERIOD_COEFFICIENTS: Record<BuildingType, { Ct: number; x: number; system: string }> = {
  panel: { Ct: 0.0488, x: 0.75, system: 'All other structural systems (large-panel bearing walls)' },
  brick: { Ct: 0.0488, x: 0.75, system: 'All other structural systems (masonry bearing walls)' },
  monolith: { Ct: 0.0466, x: 0.9, system: 'Concrete moment-resisting frames' },
};

export const PERIOD_SOURCE = 'ASCE/SEI 7-16, Eq. 12.8-7 and Table 12.8-2';

export function periodFor(type: BuildingType, storeys: number): number {
  const { Ct, x } = PERIOD_COEFFICIENTS[type];
  return Ct * (storeys * STOREY_HEIGHT_M) ** x;
}
