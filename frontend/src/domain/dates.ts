import dayjs, { type Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/ru';

dayjs.extend(customParseFormat);
dayjs.extend(isoWeek);
dayjs.locale('ru');

/** Дата без времени `YYYY-MM-DD`. В таком виде даты живут в URL, ключах кэша и запросах к API. */
export type IsoDate = string;
export const ISO_FORMAT = 'YYYY-MM-DD';

type Unit = 'month' | 'year' | 'isoWeek';

export const toDay = (date: IsoDate): Dayjs => dayjs(date, ISO_FORMAT, true);
export const toIso = (day: Dayjs): IsoDate => day.format(ISO_FORMAT);
export const isIsoDate = (value: unknown): value is IsoDate => typeof value === 'string' && dayjs(value, ISO_FORMAT, true).isValid();
export const todayIso = (): IsoDate => toIso(dayjs());
export const addDays = (date: IsoDate, n: number): IsoDate => toIso(toDay(date).add(n, 'day'));
export const addMonths = (date: IsoDate, n: number): IsoDate => toIso(toDay(date).add(n, 'month'));
export const daysInclusive = (from: IsoDate, to: IsoDate): number => toDay(to).diff(toDay(from), 'day') + 1;
export const minIso = (a: IsoDate, b: IsoDate): IsoDate => (a < b ? a : b);
export const maxIso = (a: IsoDate, b: IsoDate): IsoDate => (a > b ? a : b);
export const startOf = (date: IsoDate, unit: Unit): IsoDate => toIso(toDay(date).startOf(unit));
export const endOf = (date: IsoDate, unit: Unit): IsoDate => toIso(toDay(date).endOf(unit));

/** Дата из выгрузки ZenMoney: `YYYY-MM-DD` (можно со временем) или `DD.MM.YYYY`. */
export function parseCsvDate(raw: string): IsoDate | null {
  const value = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const ru = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(value);
  const candidate = iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : ru ? `${ru[3]}-${ru[2]}-${ru[1]}` : null;
  return candidate && isIsoDate(candidate) ? candidate : null;
}
