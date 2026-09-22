import { describe, it, expect } from 'vitest';
import { status, tag, advice, headline, summaryCounts } from './verdict';
import type { Item, ItemAssessment } from '../physics/types';

const item = (over: Partial<Item> = {}): Item => ({
  id: 'x', kind: 'wardrobe', name: 'Шкаф', x: 0, y: 0, w: 100, d: 58, height: 236, angle: 0,
  mount: { kind: 'floor' }, anchored: false, ...over,
});
const a = (over: Partial<ItemAssessment> = {}): ItemAssessment => ({
  itemId: 'x', mode: 'tips', thresholdG: 0.25, criticalIntensity: 6.8, fallsNow: true, sides: ['front'], zones: [],
  hitsWall: false, hitsBed: false, hitsPillow: false, blocksDoor: false, severity: 1, slideIntensity: null, slidesNow: false, ...over,
});

describe('verdict texts', () => {
  it('status follows the engine', () => {
    expect(status(a())).toBe('falls');
    expect(status(a({ fallsNow: false, severity: 0 }))).toBe('stands');
    expect(status(a({ mode: 'slides', slidesNow: true, fallsNow: false }))).toBe('slides');
    expect(status(a({ mode: 'anchored', fallsNow: false }))).toBe('safe');
    expect(status(a({ mode: 'wallSafe', fallsNow: false }))).toBe('safe');
    expect(status(a({ mode: 'blocked', fallsNow: false }))).toBe('stands');
    expect(status(a({ mode: 'wallFalls', fallsNow: true, severity: 1 }))).toBe('falls');
  });

  it('an item that would slide stands while friction holds', () => {
    const calm = a({ mode: 'slides', fallsNow: false, slidesNow: false, slideIntensity: 7.5, severity: 0 });
    expect(status(calm)).toBe('stands');
    expect(tag(item(), calm)).toBe('устоит');
    expect(advice(item(), calm)).toBe('Сдвинется при более сильном толчке — противоскользящие накладки');
  });

  it('tags as in the design', () => {
    expect(tag(item(), a({ severity: 4, hitsPillow: true }))).toBe('на подушку');
    expect(tag(item(), a({ severity: 3, blocksDoor: true }))).toBe('перекроет выход');
    expect(tag(item(), a({ severity: 2, hitsBed: true }))).toBe('на кровать');
    expect(tag(item(), a({ severity: 1 }))).toBe('упадёт');
    expect(tag(item(), a({ mode: 'slides', slidesNow: true, fallsNow: false, severity: 0 }))).toBe('сдвинется');
    expect(tag(item({ kind: 'mirror', name: 'Зеркало' }), a({ mode: 'anchored', fallsNow: false, severity: 0 }))).toBe('закреплено');
    expect(tag(item(), a({ mode: 'anchored', fallsNow: false, severity: 0 }))).toBe('закреплён');
    expect(tag(item(), a({ fallsNow: false, severity: 0 }))).toBe('устоит');
    expect(tag(item({ kind: 'wallShelf', name: 'Полка' }), a({ mode: 'wallFalls', severity: 1 }))).toBe('сорвётся');
  });

  it('advice per case', () => {
    expect(advice(item(), a({ severity: 4, hitsPillow: true }))).toBe('Закрепить уголком к несущей стене');
    expect(advice(item(), a({ severity: 3, blocksDoor: true }))).toBe('Закрепить или переставить от двери');
    expect(advice(item(), a({ mode: 'slides', slidesNow: true, fallsNow: false, severity: 0 }))).toBe('Противоскользящие накладки');
    expect(advice(item(), a({ mode: 'anchored', fallsNow: false, severity: 0 }))).toBe('Ничего делать не нужно');
    expect(advice(item(), a({ mode: 'wallFalls', severity: 4 }))).toBe('Перевесить на анкеры в несущую стену');
  });

  it('headline tells what hits the pillow and the exit', () => {
    const items = [item({ id: 'pax' }), item({ id: 'billy', kind: 'bookshelf', name: 'Стеллаж' })];
    const as = [a({ itemId: 'pax', severity: 4, hitsPillow: true }), a({ itemId: 'billy', severity: 3, blocksDoor: true })];
    expect(headline(items, as, true)).toBe('При расчётном толчке шкаф опрокинется на подушку, а стеллаж перекроет выход к двери.');
    expect(headline(items, as, false)).toBe('При таком толчке шкаф опрокинется на подушку, а стеллаж перекроет выход к двери.');
    expect(headline(items, [a({ itemId: 'pax', fallsNow: false, severity: 0 })], true))
      .toBe('При расчётном толчке ничего не упадёт на кровать и не перекроет выход.');
  });

  it('summary counts', () => {
    expect(summaryCounts([a(), a(), a({ mode: 'slides', slidesNow: true, fallsNow: false }), a({ mode: 'anchored', fallsNow: false })]))
      .toEqual({ falls: 2, slides: 1, safe: 1 });
  });
});
