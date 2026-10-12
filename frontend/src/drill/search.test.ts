import { describe, expect, it } from 'vitest';
import { parseBaseSearch, parseCategorySearch, parseLoginSearch } from './search';

describe('search', () => {
  it('период берётся только целиком и по порядку', () => {
    expect(parseBaseSearch({ from: '2026-09-01', to: '2026-09-30' })).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(parseBaseSearch({ from: '2026-09-30', to: '2026-09-01' })).toEqual({});
    expect(parseBaseSearch({ from: '2026-09-01' })).toEqual({});
    expect(parseBaseSearch({ from: 'вчера', to: '2026-09-01' })).toEqual({});
  });

  it('счета — непустые строки без повторов, числа становятся строками', () => {
    expect(parseBaseSearch({ acc: ['A', '', 'A', 7, null] })).toEqual({ acc: ['A', '7'] });
    expect(parseBaseSearch({ acc: 'A' })).toEqual({});
  });

  it('категория', () => {
    expect(parseCategorySearch({ cat: 'Продукты / Рынок', cur: 'KZT' })).toEqual({ cat: 'Продукты / Рынок', cur: 'KZT' });
    expect(parseCategorySearch({ cat: 2024 })).toEqual({ cat: '2024' });
  });

  it('вход: redirect только на свои страницы', () => {
    expect(parseLoginSearch({ expired: true, redirect: '/category?cat=1' })).toEqual({ expired: true, redirect: '/category?cat=1' });
    expect(parseLoginSearch({ expired: 'true' })).toEqual({ expired: true });
    expect(parseLoginSearch({ redirect: 'https://evil.example' })).toEqual({});
    expect(parseLoginSearch({ redirect: '//evil.example' })).toEqual({});
  });
});
