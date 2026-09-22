// Words for the engine's verdict: item status, card tags, checklist advice, the screen headline.

import type { Item, ItemAssessment } from '../physics/types';

export type Status = 'falls' | 'slides' | 'safe' | 'stands';

export function status(a: ItemAssessment): Status {
  if (a.mode === 'anchored' || a.mode === 'wallSafe') return 'safe';
  if (a.fallsNow) return 'falls';
  if (a.mode === 'slides' && a.slidesNow) return 'slides';
  return 'stands';
}

/** Neuter nouns take «закреплено», the rest «закреплён» / «закреплена». */
const NEUTER = new Set(['mirror']);
const FEMININE = new Set(['nightstand', 'wallShelf', 'picture', 'vase', 'bed', 'wallUnit']);
const anchoredWord = (i: Item) => (NEUTER.has(i.kind) ? 'закреплено' : FEMININE.has(i.kind) ? 'закреплена' : 'закреплён');

export function tag(item: Item, a: ItemAssessment): string {
  const s = status(a);
  if (s === 'safe') return anchoredWord(item);
  if (s === 'slides') return 'сдвинется';
  if (s === 'stands') return 'устоит';
  if (a.hitsPillow) return 'на подушку';
  if (a.blocksDoor) return 'перекроет выход';
  if (a.hitsBed) return 'на кровать';
  return a.mode === 'wallFalls' ? 'сорвётся' : 'упадёт';
}

export function advice(_item: Item, a: ItemAssessment): string {
  const s = status(a);
  if (s === 'safe') return 'Ничего делать не нужно';
  if (s === 'slides') return 'Противоскользящие накладки';
  if (a.mode === 'wallFalls') return 'Перевесить на анкеры в несущую стену';
  if (s === 'stands' && a.mode === 'slides') return 'Сдвинется при более сильном толчке — противоскользящие накладки';
  if (s === 'stands') return 'Закрепить заранее — упадёт при более сильном толчке';
  if (a.blocksDoor && !a.hitsPillow) return 'Закрепить или переставить от двери';
  return 'Закрепить уголком к несущей стене';
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const verbFall = (i: Item, a: ItemAssessment) => (a.mode === 'wallFalls' ? 'сорвётся' : i.kind === 'mirror' ? 'упадёт' : 'опрокинется');

/** «При расчётном толчке шкаф опрокинется на подушку, а стеллаж перекроет выход к двери.» */
export function headline(items: Item[], assessments: ItemAssessment[], isDesign: boolean): string {
  const lead = isDesign ? 'При расчётном толчке' : 'При таком толчке';
  const name = (id: string) => items.find((i) => i.id === id)!;
  const falling = assessments.filter((x) => x.fallsNow);
  const pillow = falling.filter((x) => x.hitsPillow);
  const door = falling.filter((x) => x.blocksDoor && !x.hitsPillow);
  const bed = falling.filter((x) => x.hitsBed && !x.hitsPillow && !x.blocksDoor);
  const parts: string[] = [];
  const list = (xs: ItemAssessment[]) => xs.map((x) => lower(name(x.itemId).name)).join(' и ');
  if (pillow.length) parts.push(`${list(pillow)} ${pillow.length > 1 ? 'опрокинутся' : verbFall(name(pillow[0].itemId), pillow[0])} на подушку`);
  if (door.length) parts.push(`${list(door)} ${door.length > 1 ? 'перекроют' : 'перекроет'} выход к двери`);
  if (!parts.length && bed.length) parts.push(`${list(bed)} ${bed.length > 1 ? 'упадут' : 'упадёт'} на кровать`);
  if (!parts.length && falling.length) parts.push(`${list(falling)} ${falling.length > 1 ? 'упадут' : 'упадёт'}, но никого не заденет`);
  if (!parts.length) return `${lead} ничего не упадёт на кровать и не перекроет выход.`;
  return `${lead} ${parts.join(', а ')}.`;
}

export function summaryCounts(assessments: ItemAssessment[]): { falls: number; slides: number; safe: number } {
  const c = { falls: 0, slides: 0, safe: 0 };
  for (const a of assessments) {
    const s = status(a);
    if (s === 'falls') c.falls++;
    else if (s === 'slides') c.slides++;
    else if (s === 'safe') c.safe++;
  }
  return c;
}
