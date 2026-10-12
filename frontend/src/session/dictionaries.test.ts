import { describe, expect, it } from 'vitest';
import { CsvFormatError, extractDictionaries, normalizeCsv } from './dictionaries';

const HEADER = 'date;categoryName;payee;comment;outcomeAccountName;outcome;outcomeCurrencyShortTitle;incomeAccountName;income;incomeCurrencyShortTitle;createdDate';
const csv = (...lines: string[]) => [HEADER, ...lines].join('\n');

describe('extractDictionaries', () => {
  it('собирает счета, валюты, категории и даты только из расходов', () => {
    const d = extractDictionaries(csv(
      '2026-09-03;Продукты / Супермаркет;Magnum;;Kaspi Gold;5430,50;KZT;;0;KZT;2026-09-03 10:00:00',
      '2026-09-01;Кафе;;;Наличные;1200,00;KZT;;0;KZT;2026-09-01 10:00:00',
      '2026-08-20;Подписки;;;Т-Банк;299,00;RUB;;0;RUB;2026-08-20 10:00:00',
      '2026-10-05;Зарплата;;;;0;KZT;Kaspi Gold;650000,00;KZT;2026-10-05 09:00:00',
      '2026-10-06;;;Перевод;Kaspi Gold;100000,00;KZT;Halyk Bank;100000,00;KZT;2026-10-06 09:00:00',
    ));
    // ICU с локалью ru ставит кириллицу перед латиницей
    expect(d.accounts).toEqual([
      { name: 'Наличные', currency: 'KZT' },
      { name: 'Т-Банк', currency: 'RUB' },
      { name: 'Kaspi Gold', currency: 'KZT' },
    ]);
    expect(d.currencies).toEqual(['KZT', 'RUB']);
    expect(d.categories).toEqual(['Кафе', 'Подписки', 'Продукты / Супермаркет']);
    expect(d.dateRange).toEqual({ min: '2026-08-20', max: '2026-09-03' });
    expect(d.separator).toBe(' / ');
  });

  it('понимает BOM, кавычки с ; внутри и даты DD.MM.YYYY', () => {
    const text = '﻿"date";"categoryName";"outcomeAccountName";"outcome";"outcomeCurrencyShortTitle";"incomeAccountName"\n"14.09.2026";"Кафе; бар";"Kaspi Gold";"2100,00";"KZT";""\n';
    const d = extractDictionaries(text);
    expect(d.categories).toEqual(['Кафе; бар']);
    expect(d.dateRange).toEqual({ min: '2026-09-14', max: '2026-09-14' });
    expect(d.separator).toBeNull();
  });

  it('понимает выгрузку ZenMoney: служебная строка, запятая-разделитель, корректировка 1970', () => {
    const text = [
      'zm_dump_2011,1791967438,,,"4,0",', '', '',
      'date,categoryName,payee,comment,outcomeAccountName,outcome,outcomeCurrencyShortTitle,incomeAccountName,income,incomeCurrencyShortTitle,createdDate,changedDate',
      '1970-01-01,Корректировка,,"Автоматическая корректировка баланса счета","Депозит (Freedom)","4323,22",KZT,,,,"2026-06-16 23:17:14","2026-10-05 17:17:04"',
      '2026-03-16,"Напитки / Снеки",,"Фьюсчай и Твикс","Freedom (Apple)","1040,0",KZT,,,,"2026-03-16 12:00:00","2026-03-16 12:00:00"',
    ].join('\n');
    const d = extractDictionaries(text);
    expect(d.accounts.map((a) => a.name).sort()).toEqual(['Freedom (Apple)', 'Депозит (Freedom)']);
    expect(d.dateRange).toEqual({ min: '2026-03-16', max: '2026-03-16' });
    expect(normalizeCsv(text).startsWith('date,categoryName')).toBe(true);
  });

  it('без нужных колонок — понятная ошибка', () => {
    expect(() => extractDictionaries('date;comment\n2026-09-01;x\n')).toThrow(CsvFormatError);
    expect(() => extractDictionaries('date;comment\n2026-09-01;x\n')).toThrow(/нет колонок: categoryName/);
  });

  it('без расходов — понятная ошибка', () => {
    expect(() => extractDictionaries(csv('2026-10-05;Зарплата;;;;0;KZT;Kaspi Gold;650000,00;KZT;'))).toThrow(/нет ни одного расхода/);
  });
});
