// Russian number and word formatting for the interface.

/** Fixed decimals with a decimal comma and a true minus sign: 9 → «9,0». */
export const num = (v: number, digits = 1): string => v.toFixed(digits).replace('.', ',').replace('-', '−');

/**
 * Russian plural: forms = [1, 2–4, 5+]. A fractional number («9,0») always takes the second form.
 */
export function plural(n: number, forms: readonly [string, string, string], fractional = !Number.isInteger(n)): string {
  if (fractional) return forms[1];
  const a = Math.abs(n) % 100, b = a % 10;
  if (a >= 11 && a <= 14) return forms[2];
  if (b === 1) return forms[0];
  if (b >= 2 && b <= 4) return forms[1];
  return forms[2];
}

export const POINTS = ['балл', 'балла', 'баллов'] as const;
/** «9,0 балла» */
export const points = (I: number): string => `${num(I)} ${plural(I, POINTS, true)}`;

export const onFloor = (floor: number): string => `на ${floor}-м этаже`;
export const floorNom = (floor: number): string => `${floor}-й этаж`;

export function countPhrase(n: number, what: 'falls' | 'slides' | 'anchored'): string {
  if (what === 'falls') return `${n} ${plural(n, ['предмет', 'предмета', 'предметов'])} ${n === 1 ? 'упадёт' : 'упадут'}`;
  if (what === 'slides') return `${n} ${n === 1 ? 'сдвинется' : 'сдвинутся'}`;
  return `${n} ${n === 1 ? 'закреплён' : 'закреплены'}`;
}
