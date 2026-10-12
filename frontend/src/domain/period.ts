import { addDays, addMonths, daysInclusive, endOf, maxIso, minIso, startOf, toDay, todayIso, type IsoDate } from './dates';

export type Period = { from: IsoDate; to: IsoDate };
/** Даты первого и последнего расхода в выгрузке. */
export type DateRange = { min: IsoDate; max: IsoDate };

export type PresetId = '30d' | 'this-month' | 'last-month' | '3m' | '12m' | 'this-year' | 'last-year' | 'all';
export const DEFAULT_PRESET: PresetId = '30d';
export const PRESETS: readonly { id: PresetId; label: string }[] = [
  { id: '30d', label: '30 дней' },
  { id: 'this-month', label: 'Этот месяц' },
  { id: 'last-month', label: 'Прошлый месяц' },
  { id: '3m', label: '3 месяца' },
  { id: '12m', label: '12 месяцев' },
  { id: 'this-year', label: 'Этот год' },
  { id: 'last-year', label: 'Прошлый год' },
  { id: 'all', label: 'Всё время' },
];

/** Точка отсчёта пресетов: сегодня, но в пределах данных. */
export function anchorDate(range: DateRange, today: IsoDate = todayIso()): IsoDate {
  return maxIso(range.min, minIso(today, range.max));
}

export function presetPeriod(id: PresetId, range: DateRange, today: IsoDate = todayIso()): Period {
  const anchor = anchorDate(range, today);
  const month = startOf(anchor, 'month');
  const year = startOf(anchor, 'year');
  switch (id) {
    case '30d':
      return { from: addDays(anchor, -29), to: anchor };
    case 'this-month':
      return { from: month, to: endOf(anchor, 'month') };
    case 'last-month': {
      const prev = addMonths(month, -1);
      return { from: prev, to: endOf(prev, 'month') };
    }
    case '3m':
      return { from: addMonths(month, -2), to: endOf(anchor, 'month') };
    case '12m':
      return { from: addMonths(month, -11), to: endOf(anchor, 'month') };
    case 'this-year':
      return { from: year, to: endOf(anchor, 'year') };
    case 'last-year': {
      const prev = addMonths(year, -12);
      return { from: prev, to: endOf(prev, 'year') };
    }
    case 'all':
      return { from: range.min, to: range.max };
  }
}

export const samePeriod = (a: Period, b: Period): boolean => a.from === b.from && a.to === b.to;

export function matchPreset(p: Period, range: DateRange, today?: IsoDate): PresetId | null {
  return PRESETS.find(({ id }) => samePeriod(presetPeriod(id, range, today), p))?.id ?? null;
}

/** Пересечение с диапазоном данных; `null` — если не пересекаются. */
export function clipPeriod(p: Period, range: DateRange): Period | null {
  const from = maxIso(p.from, range.min);
  const to = minIso(p.to, range.max);
  return from <= to ? { from, to } : null;
}

/** Знаменатель для «в среднем в день»: дни периода, за которые есть данные. */
export function effectiveDays(p: Period, range: DateRange): number {
  const clipped = clipPeriod(p, range);
  return clipped ? daysInclusive(clipped.from, clipped.to) : 0;
}

export type PeriodUnit =
  | { kind: 'day' }
  | { kind: 'week' }
  | { kind: 'month' }
  | { kind: 'year' }
  | { kind: 'months'; count: number }
  | { kind: 'days'; count: number };

/** Чем является период: днём, ISO-неделей, месяцем, годом, N целыми месяцами или просто N днями. */
export function periodUnit(p: Period): PeriodUnit {
  if (p.from === p.to) return { kind: 'day' };
  if (toDay(p.from).isoWeekday() === 1 && daysInclusive(p.from, p.to) === 7) return { kind: 'week' };
  if (p.from === startOf(p.from, 'year') && p.to === endOf(p.from, 'year')) return { kind: 'year' };
  if (p.from === startOf(p.from, 'month') && p.to === endOf(p.to, 'month')) {
    const from = toDay(p.from);
    const to = toDay(p.to);
    const count = (to.year() - from.year()) * 12 + to.month() - from.month() + 1;
    return count === 1 ? { kind: 'month' } : { kind: 'months', count };
  }
  return { kind: 'days', count: daysInclusive(p.from, p.to) };
}

function shiftBack(date: IsoDate, unit: PeriodUnit): IsoDate {
  switch (unit.kind) {
    case 'day':
      return addDays(date, -1);
    case 'week':
      return addDays(date, -7);
    case 'month':
      return addMonths(date, -1);
    case 'year':
      return addMonths(date, -12);
    case 'months':
      return addMonths(date, -unit.count);
    case 'days':
      return addDays(date, -unit.count);
  }
}

/** Предыдущая единица целиком: для месяцев и лет — до конца прошлой единицы (сентябрь → 1–31 августа). */
function previousFull(p: Period, unit: PeriodUnit): Period {
  switch (unit.kind) {
    case 'month':
    case 'months': {
      const n = unit.kind === 'month' ? 1 : unit.count;
      return { from: addMonths(p.from, -n), to: endOf(addMonths(startOf(p.to, 'month'), -n), 'month') };
    }
    case 'year': {
      const from = addMonths(p.from, -12);
      return { from, to: endOf(from, 'year') };
    }
    default:
      return { from: shiftBack(p.from, unit), to: shiftBack(p.to, unit) };
  }
}

/**
 * Период для сравнения: тот же отрезок на длину периода назад. Если текущий обрезан концом
 * данных, предыдущий обрезается так же («месяц к дате»). `null` — сравнивать не с чем.
 */
export function previousPeriod(p: Period, range: DateRange): Period | null {
  const clipped = clipPeriod(p, range);
  if (!clipped) return null;
  const unit = periodUnit(p);
  const full = previousFull(p, unit);
  const prev = {
    from: clipped.from > p.from ? shiftBack(clipped.from, unit) : full.from,
    to: clipped.to < p.to ? shiftBack(clipped.to, unit) : full.to,
  };
  return prev.from < range.min ? null : prev;
}
