// Scene colours are read from the --scene-* / --c-* tokens at runtime, so tokens.css stays the only source.

import { Color } from 'three';

const cache = new Map<string, Color>();

export function token(name: string): Color {
  let c = cache.get(name);
  if (!c) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const channels = raw.match(/\d+(?:\.\d+)?/g);
    c = raw.startsWith('rgb') && channels
      ? new Color(Number(channels[0]) / 255, Number(channels[1]) / 255, Number(channels[2]) / 255)
      : new Color(raw || 'black');
    cache.set(name, c);
  }
  return c;
}

/** Opacity of a translucent colour token (the 4th channel), 1 for opaque colours. */
export function tokenAlpha(name: string): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const channels = raw.match(/\d+(?:\.\d+)?/g);
  return raw.startsWith('rgb') && channels?.length === 4 ? Number(channels[3]) : 1;
}

/** Three visible faces of a box in the isometric view: top, the face towards +x, the face towards +z (plan +y). */
export interface Faces { top: string; x: string; z: string; stroke: string }

export const FACES = {
  falls: { top: '--scene-danger-top', x: '--scene-danger-back', z: '--scene-danger-side', stroke: '--scene-ink' },
  falls2: { top: '--scene-danger2-top', x: '--scene-danger2-x', z: '--scene-danger2-y', stroke: '--scene-ink' },
  slides: { top: '--scene-dresser-top', x: '--scene-dresser-x', z: '--scene-dresser-y', stroke: '--c-slide' },
  safe: { top: '--scene-mirror-top', x: '--scene-mirror-x', z: '--scene-mirror-y', stroke: '--c-safe' },
  stands: { top: '--scene-bed-top', x: '--scene-bed-x', z: '--scene-bed-y', stroke: '--scene-ink' },
  bedhead: { top: '--scene-bedhead-top', x: '--scene-bedhead-x', z: '--scene-bedhead-y', stroke: '--scene-ink' },
  bed: { top: '--scene-bed-top', x: '--scene-bed-x', z: '--scene-bed-y', stroke: '--scene-ink' },
  mattress: { top: '--scene-mattress-top', x: '--scene-mattress-x', z: '--scene-mattress-y', stroke: '--scene-ink' },
  blanket: { top: '--scene-blanket-top', x: '--scene-blanket-x', z: '--scene-blanket-y', stroke: '--scene-ink' },
  pillow: { top: '--scene-pillow-top', x: '--scene-pillow-x', z: '--scene-pillow-y', stroke: '--scene-ink' },
} satisfies Record<string, Faces>;
