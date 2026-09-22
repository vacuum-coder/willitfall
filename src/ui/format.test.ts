import { describe, it, expect } from 'vitest';
import { num, plural, points, onFloor, floorNom, countPhrase } from './format';

describe('Russian formatting', () => {
  it('decimal comma, fixed digits', () => {
    expect(num(9)).toBe('9,0');
    expect(num(6.7648)).toBe('6,8');
    expect(num(0.2458, 2)).toBe('0,25');
    expect(num(1.16, 2)).toBe('1,16');
    expect(num(-0.05, 1)).toBe('−0,1');
  });

  it('plural forms for integers and fractions', () => {
    const f = ['балл', 'балла', 'баллов'] as const;
    expect(plural(1, f)).toBe('балл');
    expect(plural(3, f)).toBe('балла');
    expect(plural(11, f)).toBe('баллов');
    expect(plural(21, f)).toBe('балл');
    expect(plural(9.0, f, true)).toBe('балла'); // «9,0 балла»: a fraction takes the genitive singular
    expect(points(9)).toBe('9,0 балла');
  });

  it('floors', () => {
    expect(onFloor(8)).toBe('на 8-м этаже');
    expect(floorNom(8)).toBe('8-й этаж');
  });

  it('summary counts agree with the verb', () => {
    expect(countPhrase(1, 'falls')).toBe('1 предмет упадёт');
    expect(countPhrase(2, 'falls')).toBe('2 предмета упадут');
    expect(countPhrase(5, 'falls')).toBe('5 предметов упадут');
    expect(countPhrase(1, 'slides')).toBe('1 сдвинется');
    expect(countPhrase(3, 'slides')).toBe('3 сдвинутся');
    expect(countPhrase(1, 'anchored')).toBe('1 закреплён');
    expect(countPhrase(2, 'anchored')).toBe('2 закреплены');
  });
});
