import { describe, expect, it } from 'vitest';
import { anchorDate, clipPeriod, effectiveDays, matchPreset, periodUnit, presetPeriod, previousPeriod } from './period';

const range = { min: '2023-10-12', max: '2026-10-10' };
const today = '2026-10-12';

describe('period', () => {
  it('якорь пресетов — сегодня, но не позже конца и не раньше начала данных', () => {
    expect(anchorDate(range, today)).toBe('2026-10-10');
    expect(anchorDate(range, '2026-09-01')).toBe('2026-09-01');
    expect(anchorDate(range, '2020-01-01')).toBe('2023-10-12');
  });

  it('пресеты считаются от якоря', () => {
    expect(presetPeriod('30d', range, today)).toEqual({ from: '2026-09-11', to: '2026-10-10' });
    expect(presetPeriod('this-month', range, today)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(presetPeriod('last-month', range, today)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(presetPeriod('3m', range, today)).toEqual({ from: '2026-08-01', to: '2026-10-31' });
    expect(presetPeriod('12m', range, today)).toEqual({ from: '2025-11-01', to: '2026-10-31' });
    expect(presetPeriod('this-year', range, today)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    expect(presetPeriod('last-year', range, today)).toEqual({ from: '2025-01-01', to: '2025-12-31' });
    expect(presetPeriod('all', range, today)).toEqual({ from: '2023-10-12', to: '2026-10-10' });
  });

  it('узнаёт пресет по периоду', () => {
    expect(matchPreset({ from: '2026-09-11', to: '2026-10-10' }, range, today)).toBe('30d');
    expect(matchPreset({ from: '2025-11-01', to: '2026-10-31' }, range, today)).toBe('12m');
    expect(matchPreset({ from: '2026-09-03', to: '2026-09-20' }, range, today)).toBeNull();
  });

  it('обрезает период по данным', () => {
    expect(clipPeriod({ from: '2026-09-01', to: '2026-09-30' }, range)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(clipPeriod({ from: '2026-10-01', to: '2026-10-31' }, range)).toEqual({ from: '2026-10-01', to: '2026-10-10' });
    expect(clipPeriod({ from: '2027-01-01', to: '2027-01-31' }, range)).toBeNull();
    expect(effectiveDays({ from: '2026-10-01', to: '2026-10-31' }, range)).toBe(10);
  });

  it('определяет календарную единицу периода', () => {
    expect(periodUnit({ from: '2026-09-14', to: '2026-09-14' })).toEqual({ kind: 'day' });
    expect(periodUnit({ from: '2026-09-07', to: '2026-09-13' })).toEqual({ kind: 'week' });
    expect(periodUnit({ from: '2026-09-01', to: '2026-09-30' })).toEqual({ kind: 'month' });
    expect(periodUnit({ from: '2025-01-01', to: '2025-12-31' })).toEqual({ kind: 'year' });
    expect(periodUnit({ from: '2025-11-01', to: '2026-10-31' })).toEqual({ kind: 'months', count: 12 });
    expect(periodUnit({ from: '2026-09-03', to: '2026-09-20' })).toEqual({ kind: 'days', count: 18 });
  });

  it('предыдущий период: тот же отрезок назад, «месяц к дате» для неполного', () => {
    expect(previousPeriod({ from: '2026-09-01', to: '2026-09-30' }, range)).toEqual({ from: '2026-08-01', to: '2026-08-31' });
    expect(previousPeriod({ from: '2026-10-01', to: '2026-10-31' }, range)).toEqual({ from: '2026-09-01', to: '2026-09-10' });
    expect(previousPeriod({ from: '2025-11-01', to: '2026-10-31' }, range)).toEqual({ from: '2024-11-01', to: '2025-10-10' });
    expect(previousPeriod({ from: '2026-09-07', to: '2026-09-13' }, range)).toEqual({ from: '2026-08-31', to: '2026-09-06' });
    expect(previousPeriod({ from: '2026-09-14', to: '2026-09-14' }, range)).toEqual({ from: '2026-09-13', to: '2026-09-13' });
    expect(previousPeriod({ from: '2026-09-03', to: '2026-09-20' }, range)).toEqual({ from: '2026-08-16', to: '2026-09-02' });
  });

  it('нет предыдущего периода, если он начинается раньше данных', () => {
    expect(previousPeriod({ from: '2023-10-12', to: '2026-10-10' }, range)).toBeNull();
    expect(previousPeriod({ from: '2024-01-01', to: '2024-12-31' }, range)).toBeNull();
    expect(previousPeriod({ from: '2027-01-01', to: '2027-01-31' }, range)).toBeNull();
  });
});
