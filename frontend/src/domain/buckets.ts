import { addDays, daysInclusive, endOf, maxIso, minIso, startOf, toDay, type IsoDate } from './dates';
import { MONTHS, MONTHS_GENITIVE, MONTHS_SHORT, WEEKDAYS_SHORT, capitalize } from './format';
import type { Period } from './period';

export type Granularity = 'day' | 'week' | 'month' | 'year';

export type Bucket = {
  key: string;
  granularity: Granularity;
  /** Полная календарная единица — куда ведёт клик по столбцу. */
  unit: Period;
  /** Единица, обрезанная по периоду, — что запрашиваем и рисуем. */
  span: Period;
  label: string;
  title: string;
};

export const GRANULARITY_TITLES: Record<Granularity, string> = {
  day: 'по дням',
  week: 'по неделям',
  month: 'по месяцам',
  year: 'по годам',
};

export function autoGranularity(p: Period): Granularity {
  const days = daysInclusive(p.from, p.to);
  if (days <= 31) return 'day';
  if (days <= 183) return 'week';
  const from = toDay(p.from);
  const to = toDay(p.to);
  const months = (to.year() - from.year()) * 12 + to.month() - from.month() + 1;
  return months <= 36 ? 'month' : 'year';
}

function unitAround(date: IsoDate, granularity: Granularity): Period {
  if (granularity === 'day') return { from: date, to: date };
  const unit = granularity === 'week' ? 'isoWeek' : granularity;
  return { from: startOf(date, unit), to: endOf(date, unit) };
}

const parts = (date: IsoDate) => {
  const d = toDay(date);
  return { day: d.date(), month: d.month(), year: d.year(), weekday: d.day() };
};

/** `8–14 сен` или `31 авг – 6 сен` (с родительным падежом — `8–14 сентября`). */
export function weekRange(unit: Period, months: readonly string[]): string {
  const a = parts(unit.from);
  const b = parts(unit.to);
  return a.month === b.month ? `${a.day}–${b.day} ${months[b.month]}` : `${a.day} ${months[a.month]} – ${b.day} ${months[b.month]}`;
}

function label(unit: Period, granularity: Granularity, index: number, multiMonth: boolean, multiYear: boolean): string {
  const s = parts(unit.from);
  switch (granularity) {
    case 'day':
      return multiMonth ? `${s.day} ${MONTHS_SHORT[s.month]}` : String(s.day);
    case 'week':
      return weekRange(unit, MONTHS_SHORT);
    case 'month':
      return multiYear && (index === 0 || s.month === 0) ? `${MONTHS_SHORT[s.month]}\n${s.year}` : `${MONTHS_SHORT[s.month]}`;
    case 'year':
      return String(s.year);
  }
}

function title(unit: Period, granularity: Granularity): string {
  const s = parts(unit.from);
  switch (granularity) {
    case 'day':
      return `${WEEKDAYS_SHORT[s.weekday]}, ${s.day} ${MONTHS_GENITIVE[s.month]} ${s.year}`;
    case 'week':
      return `Неделя ${weekRange(unit, MONTHS_GENITIVE)} ${parts(unit.to).year}`;
    case 'month':
      return `${capitalize(MONTHS[s.month] ?? '')} ${s.year}`;
    case 'year':
      return `${s.year} год`;
  }
}

/** Интервалы графика внутри периода. Крайние обрезаются по границам периода. */
export function makeBuckets(p: Period, granularity: Granularity = autoGranularity(p)): Bucket[] {
  const units: Period[] = [];
  for (let cursor = p.from; cursor <= p.to; ) {
    const unit = unitAround(cursor, granularity);
    units.push(unit);
    cursor = addDays(unit.to, 1);
  }
  const multiMonth = p.from.slice(0, 7) !== p.to.slice(0, 7);
  const multiYear = p.from.slice(0, 4) !== p.to.slice(0, 4);
  return units.map((unit, index) => ({
    key: `${granularity}:${unit.from}`,
    granularity,
    unit,
    span: { from: maxIso(unit.from, p.from), to: minIso(unit.to, p.to) },
    label: label(unit, granularity, index, multiMonth, multiYear),
    title: title(unit, granularity),
  }));
}
