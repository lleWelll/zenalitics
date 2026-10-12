import dayjs from 'dayjs';

const NBSP = ' ';
export const MINUS = '−';

export const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'] as const;
export const MONTHS_GENITIVE = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'] as const;
export const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'] as const;
export const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'] as const;

const SYMBOLS: Record<string, string> = {
  KZT: '₸', RUB: '₽', USD: '$', EUR: '€', GBP: '£', CNY: '¥', UAH: '₴', TRY: '₺', GEL: '₾', AMD: '֏', BYN: 'Br', KGS: 'сом', UZS: 'сум',
};
const PHRASES: Record<string, string> = { KZT: 'в тенге', RUB: 'в рублях', USD: 'в долларах', EUR: 'в евро' };

export const currencySymbol = (code: string): string => SYMBOLS[code.toUpperCase()] ?? code;
export const currencyPhrase = (code: string): string => PHRASES[code.toUpperCase()] ?? `в ${code}`;

const wholeFmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const smallFmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const compactFmt = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 });
const pctFmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

const withMinus = (s: string) => s.replace('-', MINUS);

/** `1 234 567 ₸`. Копейки — только у маленьких сумм, где они что-то значат. */
export function formatMoney(value: number, currency: string): string {
  const body = Math.abs(value) < 100 && !Number.isInteger(value) ? smallFmt.format(value) : wholeFmt.format(value);
  return `${withMinus(body)}${NBSP}${currencySymbol(currency)}`;
}

/** Для осей: `1,2 млн`, `350 тыс.` */
export const formatCompact = (value: number): string => withMinus(compactFmt.format(value));
export const formatCompactMoney = (value: number, currency: string): string => `${formatCompact(value)}${NBSP}${currencySymbol(currency)}`;
export const formatCount = (n: number): string => wholeFmt.format(n);

/** `14,6 %` — на вход проценты, а не доли. */
export const formatPct = (pct: number): string => `${withMinus(pctFmt.format(pct))}${NBSP}%`;

const pluralRules = new Intl.PluralRules('ru-RU');
/** `plural(5, ['операция', 'операции', 'операций'])` → `операций` */
export function plural(n: number, forms: readonly [one: string, few: string, many: string]): string {
  const rule = pluralRules.select(n);
  return rule === 'one' ? forms[0] : rule === 'few' ? forms[1] : forms[2];
}

export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** `1 операция`, `3 операции`, `1 500 операций` */
export const formatOps = (n: number): string => `${formatCount(n)} ${plural(n, ['операция', 'операции', 'операций'])}`;

/** `14:05:32 (14-10-2026)` */
export const formatLoadedAt = (ms: number): string => dayjs(ms).format('HH:mm:ss (DD-MM-YYYY)');
