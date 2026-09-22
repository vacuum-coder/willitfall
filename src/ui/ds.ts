// Design-system references for inline styles. Every value is a CSS variable from tokens.css.

import type { CSSProperties } from 'react';

export const C = {
  bg: 'var(--c-bg)', surface: 'var(--c-surface)', surface2: 'var(--c-surface-2)',
  border: 'var(--c-border)', borderStrong: 'var(--c-border-strong)', rule: 'var(--c-rule)',
  text: 'var(--c-text)', text2: 'var(--c-text-2)', poche: 'var(--c-poche)', onAccent: 'var(--c-on-accent)',
  danger: 'var(--c-danger)', dangerHover: 'var(--c-danger-hover)', dangerPressed: 'var(--c-danger-pressed)',
  dangerTint: 'var(--c-danger-tint)', dangerZone: 'var(--c-danger-zone)',
  safe: 'var(--c-safe)', safeTint: 'var(--c-safe-tint)', slide: 'var(--c-slide)', slideTint: 'var(--c-slide-tint)',
} as const;

export const SCENE = {
  ink: 'var(--scene-ink)', floor: 'var(--scene-floor)', floorLine: 'var(--scene-floor-line)', floorAo: 'var(--scene-floor-ao)',
  wallLeft: 'var(--scene-wall-left)', wallBack: 'var(--scene-wall-back)', window: 'var(--scene-window)', poche: 'var(--scene-poche)',
  dresserTop: 'var(--scene-dresser-top)', mirrorTop: 'var(--scene-mirror-top)', shadow: 'var(--scene-shadow)', ghost: 'var(--scene-ghost)',
} as const;

type Fs = 12 | 13 | 14 | 16 | 18 | 22 | 26 | 32 | 44;
/** Font size with its paired line height. */
export const fs = (n: Fs): CSSProperties => ({ fontSize: `var(--fs-${n})`, lineHeight: `var(--lh-${n})` });

type Sp = 0 | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 20 | 24 | 28 | 32 | 36 | 48;
/** Spacing token; several values give a shorthand («12 16» → padding: 12px 16px). */
export const sp = (...n: Sp[]): string => n.map((v) => (v === 0 ? '0' : `var(--s-${v})`)).join(' ');

export const R = { xs: 'var(--r-xs)', sm: 'var(--r-sm)', md: 'var(--r-md)', lg: 'var(--r-lg)', full: 'var(--r-full)' } as const;
export const SH = { 1: 'var(--sh-1)', 2: 'var(--sh-2)', 3: 'var(--sh-3)' } as const;
export const H = { xs: 'var(--h-xs)', sm: 'var(--h-sm)', md: 'var(--h-md)', lg: 'var(--h-lg)', xl: 'var(--h-xl)' } as const;
export const FONT = { display: 'var(--font-display)', ui: 'var(--font-ui)' } as const;
export const LS = { display: 'var(--ls-display)', number: 'var(--ls-number)' } as const;

/** Italic step number «1», «2», «3» in front of a section title. */
export const stepNumber: CSSProperties = {
  fontFamily: FONT.display, fontStyle: 'italic', fontWeight: 500, ...fs(22), color: C.text,
};

export const card: CSSProperties = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: R.lg, boxShadow: SH[1],
};

export const button = {
  primary: {
    height: H.lg, padding: sp(0, 16), border: 0, borderRadius: R.md, background: C.danger, color: C.onAccent,
    ...fs(14), fontWeight: 700, whiteSpace: 'nowrap',
  },
  secondary: {
    height: H.lg, padding: sp(0, 14), border: `1px solid ${C.borderStrong}`, borderRadius: R.md, background: C.surface,
    color: C.text, ...fs(14), fontWeight: 600, whiteSpace: 'nowrap',
  },
} satisfies Record<string, CSSProperties>;

export const selectStyle: CSSProperties = {
  WebkitAppearance: 'none', appearance: 'none', display: 'block', height: H.lg, boxSizing: 'border-box',
  padding: sp(0, 36, 0, 12), border: `1px solid ${C.borderStrong}`, borderRadius: R.md, background: C.surface,
  ...fs(14), fontWeight: 600, color: C.text,
};
