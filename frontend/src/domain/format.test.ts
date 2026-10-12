import { describe, expect, it } from 'vitest';
import {
  currencyPhrase,
  currencySymbol,
  formatCompact,
  formatCompactMoney,
  formatCount,
  formatLoadedAt,
  formatMoney,
  formatOps,
  formatPct,
  plural,
} from './format';

// Intl ставит неразрывные пробелы — для читаемости ожиданий меняем их на обычные.
const n = (s: string) => s.replace(/[  ]/g, ' ');

describe('format', () => {
  it('деньги: разряды, символ валюты, типографский минус', () => {
    expect(n(formatMoney(1234567.4, 'KZT'))).toBe('1 234 567 ₸');
    expect(n(formatMoney(-1500, 'RUB'))).toBe('−1 500 ₽');
    expect(n(formatMoney(12.5, 'USD'))).toBe('12,5 $');
    expect(n(formatMoney(99, 'XYZ'))).toBe('99 XYZ');
  });

  it('компактные числа для осей', () => {
    expect(n(formatCompact(1234567))).toBe('1,2 млн');
    expect(n(formatCompact(350000))).toBe('350 тыс.');
    expect(n(formatCompact(999))).toBe('999');
    expect(n(formatCompactMoney(2500000, 'KZT'))).toBe('2,5 млн ₸');
  });

  it('проценты и счёт', () => {
    expect(n(formatPct(14.6))).toBe('14,6 %');
    expect(n(formatCount(1500))).toBe('1 500');
  });

  it('русские множественные формы', () => {
    const forms = ['операция', 'операции', 'операций'] as const;
    expect(plural(1, forms)).toBe('операция');
    expect(plural(3, forms)).toBe('операции');
    expect(plural(5, forms)).toBe('операций');
    expect(plural(11, forms)).toBe('операций');
    expect(plural(21, forms)).toBe('операция');
    expect(n(formatOps(1500))).toBe('1 500 операций');
  });

  it('валюты словами и символами', () => {
    expect(currencySymbol('kzt')).toBe('₸');
    expect(currencyPhrase('KZT')).toBe('в тенге');
    expect(currencyPhrase('RUB')).toBe('в рублях');
    expect(currencyPhrase('GEL')).toBe('в GEL');
  });

  it('момент загрузки', () => {
    expect(formatLoadedAt(new Date(2026, 9, 14, 14, 5, 32).getTime())).toBe('14:05:32 (14-10-2026)');
  });
});
