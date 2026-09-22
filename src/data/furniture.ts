// Real products only: every size is copied from the manufacturer's product page linked in `url`
// (checked 22.09.2026). Width w and depth d in the item's own axes, centimetres.

import type { FurnitureKind } from '../physics/types';

export interface CatalogItem {
  key: string;
  kind: FurnitureKind;
  name: string;
  w: number;
  d: number;
  height: number;
  url: string;
}

export const CATALOG: CatalogItem[] = [
  { key: 'ikea-pax-236', kind: 'wardrobe', name: 'IKEA PAX', w: 100, d: 58, height: 236, url: 'https://www.ikea.com/gb/en/p/pax-wardrobe-frame-white-80458207/' },
  { key: 'stolplit-brooklyn-3', kind: 'wardrobe', name: 'Столплит «Бруклин», 3 двери', w: 117, d: 53, height: 202, url: 'https://www.stolplit.ru/internet-magazin/kupit/118118578-shkaf-3-dvernyy-bruklin-sb-3347/' },
  { key: 'ikea-billy', kind: 'bookshelf', name: 'IKEA BILLY', w: 80, d: 28, height: 202, url: 'https://www.ikea.com/gb/en/p/billy-bookcase-white-00263850/' },
  { key: 'ikea-hemnes', kind: 'bookshelf', name: 'IKEA HEMNES', w: 90, d: 37, height: 197, url: 'https://www.ikea.com/gb/en/p/hemnes-bookcase-white-stain-light-brown-60413502/' },
  { key: 'ikea-malm-4', kind: 'dresser', name: 'IKEA MALM, 4 ящика', w: 80, d: 48, height: 100, url: 'https://www.ikea.com/gb/en/p/malm-chest-of-4-drawers-high-gloss-white-50424054/' },
  { key: 'ikea-ikornnes', kind: 'mirror', name: 'IKEA IKORNNES, напольное зеркало', w: 52, d: 52, height: 167, url: 'https://www.ikea.com/gb/en/p/ikornnes-standing-mirror-ash-30298396/' },
];

/** What the interface calls each kind of item. */
export const KIND_LABEL: Record<FurnitureKind, string> = {
  bed: 'Кровать', wardrobe: 'Шкаф', wallUnit: 'Стенка', bookshelf: 'Стеллаж', dresser: 'Комод',
  nightstand: 'Тумба', fridge: 'Холодильник', mirror: 'Зеркало', tv: 'Телевизор', wallShelf: 'Полка',
  picture: 'Картина', vase: 'Ваза',
};

export const product = (key: string): CatalogItem => {
  const p = CATALOG.find((c) => c.key === key);
  if (!p) throw new Error(`unknown product ${key}`);
  return p;
};
