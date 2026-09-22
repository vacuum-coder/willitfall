import { useEffect, useRef, useState } from 'react';

/** Live width of an element (ResizeObserver), for layouts that must fit their column. */
export function useElementWidth<T extends HTMLElement>(initial = 0) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    setWidth(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
/** Rendered width of a one-line label in the interface font. */
export function textWidth(text: string, font = '600 12px Manrope'): number {
  if (!ctx) return text.length * 7;
  ctx.font = font;
  return ctx.measureText(text).width;
}
