import Papa from 'papaparse';
import { detectSeparator } from '../domain/categories';
import { parseCsvDate, type IsoDate } from '../domain/dates';
import type { DateRange } from '../domain/period';

export type Account = { name: string; currency: string };

/** Справочники из выгрузки: только списки, никаких сумм — все цифры считает бэк. */
export type Dictionaries = {
  accounts: Account[];
  currencies: string[];
  categories: string[];
  dateRange: DateRange;
  separator: string | null;
};

export class CsvFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvFormatError';
  }
}

const REQUIRED = ['date', 'categoryName', 'outcomeAccountName', 'outcome', 'outcomeCurrencyShortTitle', 'incomeAccountName'] as const;

const HEADER_LINE = /^"?date"?[;,]/;

/**
 * Настоящая выгрузка ZenMoney начинается не с заголовка, а со служебной строки
 * (`zm_dump_2011,<время>,,,"4,0",`) и пустых строк. Отбрасываем всё до строки с `date`
 * и BOM — и разбор здесь, и бэк (DuckDB) получают чистый CSV.
 */
export function normalizeCsv(csvText: string): string {
  const text = csvText.charCodeAt(0) === 0xfeff ? csvText.slice(1) : csvText;
  const lines = text.split('\n');
  const start = lines.findIndex((line) => HEADER_LINE.test(line.trim()));
  return start > 0 ? lines.slice(start).join('\n') : text;
}

/** Даты вроде 1970-01-01 — служебные (автокорректировка баланса), в период данных не входят. */
const MIN_REAL_YEAR = 2000;

export function extractDictionaries(csvText: string): Dictionaries {
  const text = normalizeCsv(csvText);
  const firstLine = text.split('\n', 1)[0] ?? '';
  const parsed = Papa.parse<Record<string, string | undefined>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter: firstLine.includes(';') ? ';' : ',',
    transformHeader: (h) => h.trim(),
  });
  const fields = parsed.meta.fields ?? [];
  const missing = REQUIRED.filter((f) => !fields.includes(f));
  if (missing.length) throw new CsvFormatError(`В выгрузке нет колонок: ${missing.join(', ')}`);

  const accounts = new Map<string, string>();
  const categories = new Set<string>();
  let min: IsoDate | null = null;
  let max: IsoDate | null = null;

  for (const row of parsed.data) {
    // Расход — как в SQL бэка: есть счёт списания, нет счёта зачисления, есть сумма.
    const out = row.outcomeAccountName?.trim() ?? '';
    if (!out || row.incomeAccountName?.trim() || !row.outcome?.trim()) continue;
    const date = parseCsvDate(row.date ?? '');
    if (!date) continue;
    if (!accounts.has(out)) accounts.set(out, row.outcomeCurrencyShortTitle?.trim() || '—');
    const category = row.categoryName?.trim();
    if (category) categories.add(category);
    if (Number(date.slice(0, 4)) < MIN_REAL_YEAR) continue;
    if (min === null || date < min) min = date;
    if (max === null || date > max) max = date;
  }
  if (min === null || max === null) throw new CsvFormatError('В выгрузке нет ни одного расхода');

  const accountList = [...accounts].map(([name, currency]) => ({ name, currency })).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const perCurrency = new Map<string, number>();
  for (const a of accountList) perCurrency.set(a.currency, (perCurrency.get(a.currency) ?? 0) + 1);
  const currencies = [...perCurrency].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c);
  const categoryList = [...categories].sort((a, b) => a.localeCompare(b, 'ru'));
  return { accounts: accountList, currencies, categories: categoryList, dateRange: { min, max }, separator: detectSeparator(categoryList) };
}
