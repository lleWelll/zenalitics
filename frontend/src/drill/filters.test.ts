import { describe, expect, it } from 'vitest';
import type { Dictionaries } from '../session/dictionaries';
import { resolveFilters } from './filters';

const dict: Dictionaries = {
  accounts: [{ name: 'Kaspi Gold', currency: 'KZT' }, { name: 'Наличные', currency: 'KZT' }, { name: 'Т-Банк', currency: 'RUB' }],
  currencies: ['KZT', 'RUB'],
  categories: [],
  dateRange: { min: '2023-10-12', max: '2026-10-10' },
  separator: ' / ',
};
const today = '2026-10-12';

describe('resolveFilters', () => {
  it('по умолчанию — 30 дней, первая валюта, все счета', () => {
    expect(resolveFilters({}, dict, {}, today)).toEqual({
      period: { from: '2026-09-11', to: '2026-10-10' },
      isDefaultPeriod: true,
      currency: 'KZT',
      accounts: [],
      currencyAccounts: ['Kaspi Gold', 'Наличные'],
    });
  });

  it('валюта: из URL, иначе из настроек; неизвестная валюта игнорируется', () => {
    expect(resolveFilters({ cur: 'RUB' }, dict, { currency: 'KZT' }, today).currency).toBe('RUB');
    expect(resolveFilters({}, dict, { currency: 'RUB' }, today).currency).toBe('RUB');
    expect(resolveFilters({ cur: 'USD' }, dict, {}, today).currency).toBe('KZT');
  });

  it('счета другой валюты и неизвестные отбрасываются — суммы валют не смешиваются', () => {
    expect(resolveFilters({ acc: ['Т-Банк', 'Kaspi Gold', 'Чужой'] }, dict, {}, today).accounts).toEqual(['Kaspi Gold']);
    expect(resolveFilters({ cur: 'RUB', acc: ['Kaspi Gold'] }, dict, {}, today).accounts).toEqual([]);
  });

  it('явный период из URL', () => {
    const f = resolveFilters({ from: '2026-09-01', to: '2026-09-30' }, dict, {}, today);
    expect(f.period).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(f.isDefaultPeriod).toBe(false);
  });
});
