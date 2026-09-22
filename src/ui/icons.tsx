// Icons from the artboards, stroke colours from the tokens.

import { C } from './ds';

const hidden = { 'aria-hidden': true, focusable: false } as const;

export const Logo = () => (
  <svg width="32" height="32" viewBox="0 0 28 28" fill="none" {...hidden}>
    <path d="M19 10.5A6.5 6.5 0 1 1 12.5 4a5 5 0 0 0 6.5 6.5z" style={{ stroke: C.text }} strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M2.5 22.5h5l1.8-3 2.4 5 3-7 2.4 5 1.4-2h7" style={{ stroke: C.danger }} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Chevron = ({ right = 12 }: { right?: number }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" {...hidden} style={{ position: 'absolute', right, top: 14, pointerEvents: 'none' }}>
    <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" style={{ stroke: C.text }} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Plus = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" {...hidden}>
    <path d="M5 1v8M1 5h8" style={{ stroke: C.text }} strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const StepMinus = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" {...hidden}>
    <path d="M2 6h8" style={{ stroke: C.text }} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const StepPlus = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" {...hidden}>
    <path d="M2 6h8M6 2v8" style={{ stroke: C.text }} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const Move = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...hidden}>
    <path d="M8 1.5v13M1.5 8h13M8 1.5L6 3.5M8 1.5l2 2M8 14.5l-2-2M8 14.5l2-2M1.5 8l2-2M1.5 8l2 2M14.5 8l-2-2M14.5 8l-2 2" fill="none" style={{ stroke: C.text2 }} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Shake = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...hidden}>
    <path d="M1 8.5h2.5l1.5-3 2.5 6 2.5-7 2 4H15" fill="none" style={{ stroke: C.onAccent }} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const FallArrow = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" {...hidden}>
    <path d="M8.5 1.5L2 8M2 3.5V8h4.5" fill="none" style={{ stroke: C.danger }} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ZoneSwatch = () => (
  <svg width="14" height="8" viewBox="0 0 14 8" {...hidden}>
    <rect x="0.5" y="0.5" width="13" height="7" style={{ fill: C.dangerTint, stroke: C.danger }} strokeDasharray="3 2" />
  </svg>
);

export const PassageSwatch = () => (
  <svg width="14" height="8" viewBox="0 0 14 8" {...hidden}>
    <rect x="0.5" y="0.5" width="13" height="7" fill="none" style={{ stroke: C.safe }} strokeDasharray="2 2" />
  </svg>
);

export const LegendFalls = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" {...hidden}>
    <rect x="0.5" y="0.5" width="11" height="11" rx="1.5" style={{ fill: C.dangerTint, stroke: C.danger }} />
    <path d="M1 7l6-6M5 11l6-6" style={{ stroke: C.danger }} strokeWidth="1" />
  </svg>
);

export const LegendSlides = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" {...hidden}>
    <rect x="0.5" y="0.5" width="11" height="11" rx="1.5" style={{ fill: 'var(--scene-dresser-top)', stroke: C.slide }} />
  </svg>
);

export const LegendAnchored = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" {...hidden}>
    <rect x="0.5" y="0.5" width="11" height="11" rx="1.5" style={{ fill: 'var(--scene-mirror-x)', stroke: C.safe }} />
  </svg>
);
