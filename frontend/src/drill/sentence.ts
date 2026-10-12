import { weekRange } from '../domain/buckets';
import { endOf, startOf, toDay } from '../domain/dates';
import { MONTHS, MONTHS_GENITIVE, MONTHS_SHORT, plural } from '../domain/format';
import { matchPreset, periodUnit, type DateRange, type Period } from '../domain/period';

/** Часть фразы периода: обычный текст, кнопка выбора периода или крошка «вверх». */
export type PeriodPart = { kind: 'text' | 'picker' | 'crumb'; text: string; target?: Period; hint?: string };

const t = (text: string): PeriodPart => ({ kind: 'text', text });
const picker = (text: string): PeriodPart => ({ kind: 'picker', text });

function monthCrumb(date: string): PeriodPart {
  const month = toDay(date).month();
  return { kind: 'crumb', text: MONTHS_GENITIVE[month]!, target: { from: startOf(date, 'month'), to: endOf(date, 'month') }, hint: `Весь ${MONTHS[month]} ${toDay(date).year()}` };
}

function yearCrumb(date: string): PeriodPart {
  const year = toDay(date).year();
  return { kind: 'crumb', text: String(year), target: { from: startOf(date, 'year'), to: endOf(date, 'year') }, hint: `Весь ${year} год` };
}

const PRESET_PHRASES = { '30d': '30 дней', '3m': '3 месяца', '12m': '12 месяцев', all: 'всё время' } as const;

/** «с 3 по 20 сентября 2026», «с 3 сентября по 5 октября 2026», «с 30 декабря 2025 по 5 января 2026» */
function dayRange(p: Period): string {
  const a = toDay(p.from);
  const b = toDay(p.to);
  if (a.year() !== b.year()) return `с ${a.date()} ${MONTHS_GENITIVE[a.month()]} ${a.year()} по ${b.date()} ${MONTHS_GENITIVE[b.month()]} ${b.year()}`;
  if (a.month() !== b.month()) return `с ${a.date()} ${MONTHS_GENITIVE[a.month()]} по ${b.date()} ${MONTHS_GENITIVE[b.month()]} ${b.year()}`;
  return `с ${a.date()} по ${b.date()} ${MONTHS_GENITIVE[b.month()]} ${b.year()}`;
}

/** «с марта по май 2026», «с ноября 2025 по февраль 2026» */
function monthRange(p: Period): string {
  const a = toDay(p.from);
  const b = toDay(p.to);
  return a.year() === b.year()
    ? `с ${MONTHS_GENITIVE[a.month()]} по ${MONTHS[b.month()]} ${b.year()}`
    : `с ${MONTHS_GENITIVE[a.month()]} ${a.year()} по ${MONTHS[b.month()]} ${b.year()}`;
}

/** Период словами для строки-запроса. Части даты — крошки, которые расширяют период. */
export function periodPhrase(p: Period, range: DateRange, today?: string): PeriodPart[] {
  const unit = periodUnit(p);
  const from = toDay(p.from);
  switch (unit.kind) {
    case 'day':
      return [t('за '), picker(String(from.date())), t(' '), monthCrumb(p.from), t(' '), yearCrumb(p.from)];
    case 'week': {
      const sameMonth = from.month() === toDay(p.to).month();
      return sameMonth
        ? [t('за '), picker(`неделю ${from.date()}–${toDay(p.to).date()}`), t(' '), monthCrumb(p.from), t(' '), yearCrumb(p.from)]
        : [t('за '), picker(`неделю ${weekRange(p, MONTHS_GENITIVE)}`), t(' '), yearCrumb(p.to)];
    }
    case 'month':
      return [t('за '), picker(MONTHS[from.month()]!), t(' '), yearCrumb(p.from)];
    case 'year':
      return [t('за '), picker(`${from.year()} год`)];
    default: {
      const preset = matchPreset(p, range, today);
      if (preset === '30d' || preset === '3m' || preset === '12m' || preset === 'all') return [t('за '), picker(PRESET_PHRASES[preset])];
      return [picker(unit.kind === 'months' ? monthRange(p) : dayRange(p))];
    }
  }
}

/** Короткая подпись периода: для дельт («к сен 2026») и подзаголовков. */
export function periodCompact(p: Period): string {
  const a = toDay(p.from);
  const b = toDay(p.to);
  const unit = periodUnit(p);
  if (unit.kind === 'day') return `${a.date()} ${MONTHS_SHORT[a.month()]} ${a.year()}`;
  if (unit.kind === 'month') return `${MONTHS_SHORT[a.month()]} ${a.year()}`;
  if (unit.kind === 'year') return String(a.year());
  if (unit.kind === 'months') return `${MONTHS_SHORT[a.month()]} ${a.year()} – ${MONTHS_SHORT[b.month()]} ${b.year()}`;
  if (a.year() !== b.year()) return `${a.date()} ${MONTHS_SHORT[a.month()]} ${a.year()} – ${b.date()} ${MONTHS_SHORT[b.month()]} ${b.year()}`;
  return `${weekRange(p, MONTHS_SHORT)} ${b.year()}`;
}

export function accountsPhrase(selected: readonly string[], all: readonly string[]): string {
  if (selected.length === 0 || selected.length === all.length) return all.length === 1 ? `со счёта ${all[0]}` : 'со всех счетов';
  if (selected.length === 1) return `со счёта ${selected[0]}`;
  return `с ${selected.length} ${plural(selected.length, ['счёта', 'счетов', 'счетов'])}`;
}
