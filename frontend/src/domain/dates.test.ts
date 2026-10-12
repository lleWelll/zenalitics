import { describe, expect, it } from 'vitest';
import { addDays, addMonths, daysInclusive, endOf, isIsoDate, maxIso, minIso, parseCsvDate, startOf } from './dates';

describe('dates', () => {
  it('проверяет строгий формат YYYY-MM-DD', () => {
    expect(isIsoDate('2026-09-14')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('14.09.2026')).toBe(false);
    expect(isIsoDate(20260914)).toBe(false);
  });

  it('считает дни и сдвигает даты', () => {
    expect(daysInclusive('2026-09-01', '2026-09-30')).toBe(30);
    expect(daysInclusive('2026-09-14', '2026-09-14')).toBe(1);
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(minIso('2026-01-02', '2025-12-31')).toBe('2025-12-31');
    expect(maxIso('2026-01-02', '2025-12-31')).toBe('2026-01-02');
  });

  it('находит границы месяца, года и ISO-недели', () => {
    expect(startOf('2026-09-14', 'month')).toBe('2026-09-01');
    expect(endOf('2026-02-10', 'month')).toBe('2026-02-28');
    expect(startOf('2026-09-14', 'year')).toBe('2026-01-01');
    expect(endOf('2026-09-14', 'year')).toBe('2026-12-31');
    expect(startOf('2026-09-03', 'isoWeek')).toBe('2026-08-31');
    expect(endOf('2026-09-03', 'isoWeek')).toBe('2026-09-06');
  });

  it('разбирает даты выгрузки ZenMoney', () => {
    expect(parseCsvDate('2026-09-14')).toBe('2026-09-14');
    expect(parseCsvDate(' 2026-09-14 18:30:00 ')).toBe('2026-09-14');
    expect(parseCsvDate('14.09.2026')).toBe('2026-09-14');
    expect(parseCsvDate('2026-02-30')).toBeNull();
    expect(parseCsvDate('вчера')).toBeNull();
  });
});
