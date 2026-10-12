import { DEFAULT_PRESET, presetPeriod, samePeriod, type Period } from '../domain/period';
import type { Dictionaries } from '../session/dictionaries';
import type { Prefs } from '../session/prefs';
import type { BaseSearch } from './search';

export type Filters = {
  period: Period;
  isDefaultPeriod: boolean;
  currency: string;
  /** Выбранные счета; пусто — все счета валюты. */
  accounts: string[];
  /** Все счета выбранной валюты. */
  currencyAccounts: string[];
};

/** URL + настройки + справочники → фильтры. Мусор в URL молча игнорируется. */
export function resolveFilters(search: BaseSearch, dict: Dictionaries, prefs: Prefs, today?: string): Filters {
  const fallback = presetPeriod(DEFAULT_PRESET, dict.dateRange, today);
  const period = search.from && search.to ? { from: search.from, to: search.to } : fallback;
  const currency = [search.cur, prefs.currency].find((c): c is string => !!c && dict.currencies.includes(c)) ?? dict.currencies[0] ?? '';
  const currencyAccounts = dict.accounts.filter((a) => a.currency === currency).map((a) => a.name);
  const accounts = (search.acc ?? []).filter((a) => currencyAccounts.includes(a));
  return { period, isDefaultPeriod: samePeriod(period, fallback), currency, accounts, currencyAccounts };
}
