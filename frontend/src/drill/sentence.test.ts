import { describe, expect, it } from 'vitest';
import { accountsPhrase, periodCompact, periodPhrase } from './sentence';

const range = { min: '2023-10-12', max: '2026-10-10' };
const today = '2026-10-12';
const text = (p: { from: string; to: string }) => periodPhrase(p, range, today).map((x) => x.text).join('');
const crumbs = (p: { from: string; to: string }) => periodPhrase(p, range, today).filter((x) => x.kind === 'crumb').map((x) => [x.text, x.target]);

describe('periodPhrase', () => {
  it('день: месяц и год — крошки', () => {
    expect(text({ from: '2026-09-14', to: '2026-09-14' })).toBe('за 14 сентября 2026');
    expect(crumbs({ from: '2026-09-14', to: '2026-09-14' })).toEqual([
      ['сентября', { from: '2026-09-01', to: '2026-09-30' }],
      ['2026', { from: '2026-01-01', to: '2026-12-31' }],
    ]);
  });

  it('неделя внутри месяца и через границу месяцев', () => {
    expect(text({ from: '2026-09-07', to: '2026-09-13' })).toBe('за неделю 7–13 сентября 2026');
    expect(crumbs({ from: '2026-09-07', to: '2026-09-13' }).map(([t]) => t)).toEqual(['сентября', '2026']);
    expect(text({ from: '2026-08-31', to: '2026-09-06' })).toBe('за неделю 31 августа – 6 сентября 2026');
    expect(crumbs({ from: '2026-08-31', to: '2026-09-06' }).map(([t]) => t)).toEqual(['2026']);
  });

  it('месяц, год, пресеты', () => {
    expect(text({ from: '2026-09-01', to: '2026-09-30' })).toBe('за сентябрь 2026');
    expect(crumbs({ from: '2026-09-01', to: '2026-09-30' }).map(([t]) => t)).toEqual(['2026']);
    expect(text({ from: '2025-01-01', to: '2025-12-31' })).toBe('за 2025 год');
    expect(text({ from: '2026-09-11', to: '2026-10-10' })).toBe('за 30 дней');
    expect(text({ from: '2025-11-01', to: '2026-10-31' })).toBe('за 12 месяцев');
    expect(text({ from: '2026-08-01', to: '2026-10-31' })).toBe('за 3 месяца');
    expect(text({ from: '2023-10-12', to: '2026-10-10' })).toBe('за всё время');
  });

  it('произвольные диапазоны', () => {
    expect(text({ from: '2026-03-01', to: '2026-05-31' })).toBe('с марта по май 2026');
    expect(text({ from: '2025-11-01', to: '2026-02-28' })).toBe('с ноября 2025 по февраль 2026');
    expect(text({ from: '2026-09-03', to: '2026-09-20' })).toBe('с 3 по 20 сентября 2026');
    expect(text({ from: '2026-09-03', to: '2026-10-05' })).toBe('с 3 сентября по 5 октября 2026');
    expect(text({ from: '2025-12-30', to: '2026-01-05' })).toBe('с 30 декабря 2025 по 5 января 2026');
  });
});

describe('короткие подписи и счета', () => {
  it('periodCompact', () => {
    expect(periodCompact({ from: '2026-09-14', to: '2026-09-14' })).toBe('14 сен 2026');
    expect(periodCompact({ from: '2026-09-01', to: '2026-09-30' })).toBe('сен 2026');
    expect(periodCompact({ from: '2025-01-01', to: '2025-12-31' })).toBe('2025');
    expect(periodCompact({ from: '2026-09-01', to: '2026-09-10' })).toBe('1–10 сен 2026');
    expect(periodCompact({ from: '2024-11-01', to: '2025-10-10' })).toBe('1 ноя 2024 – 10 окт 2025');
    expect(periodCompact({ from: '2025-11-01', to: '2026-10-31' })).toBe('ноя 2025 – окт 2026');
  });

  it('accountsPhrase', () => {
    expect(accountsPhrase([], ['A', 'B'])).toBe('со всех счетов');
    expect(accountsPhrase(['A', 'B'], ['A', 'B'])).toBe('со всех счетов');
    expect(accountsPhrase([], ['A'])).toBe('со счёта A');
    expect(accountsPhrase(['A'], ['A', 'B'])).toBe('со счёта A');
    expect(accountsPhrase(['A', 'B'], ['A', 'B', 'C'])).toBe('с 2 счетов');
    expect(accountsPhrase(Array.from({ length: 21 }, (_, i) => `a${i}`), Array.from({ length: 30 }, (_, i) => `a${i}`))).toBe('с 21 счёта');
  });
});
