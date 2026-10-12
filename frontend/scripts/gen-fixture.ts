// Синтетическая выгрузка ZenMoney для разработки: `npm run fixture`.
// Формат как у настоящей: `;`, суммы с запятой, подкатегории через « / ».
// Детерминирована по дате: один и тот же день всегда даёт одни и те же операции.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../dev-data/synthetic.csv');
if (process.argv.includes('--if-missing') && existsSync(OUT)) process.exit(0);

type Account = { name: string; currency: string; weight: number };
type Spend = { category: string; weight: number; min: number; max: number; payees: string[] };

const ACCOUNTS: Account[] = [
  { name: 'Kaspi Gold', currency: 'KZT', weight: 6 },
  { name: 'Halyk Bank', currency: 'KZT', weight: 3 },
  { name: 'Наличные', currency: 'KZT', weight: 2 },
  { name: 'Jusan', currency: 'KZT', weight: 1 },
  { name: 'Т-Банк', currency: 'RUB', weight: 1 },
];
const KZT_ACCOUNTS = ACCOUNTS.filter((a) => a.currency === 'KZT');
const MAIN = ACCOUNTS[0]!;
const RUB = ACCOUNTS[4]!;

const SPENDS: Spend[] = [
  { category: 'Продукты / Супермаркет', weight: 20, min: 2500, max: 28000, payees: ['Magnum', 'Small', 'Galmart', 'Arbuz.kz'] },
  { category: 'Продукты / Рынок', weight: 5, min: 1500, max: 12000, payees: ['Зелёный базар', ''] },
  { category: 'Продукты', weight: 4, min: 500, max: 6000, payees: ['Магазин у дома', ''] },
  { category: 'Кафе и рестораны / Кофейни', weight: 9, min: 900, max: 3500, payees: ['Coffee Boom', 'Starbucks', 'Kaldi'] },
  { category: 'Кафе и рестораны / Доставка', weight: 5, min: 3500, max: 14000, payees: ['Wolt', 'Glovo', 'Яндекс Еда'] },
  { category: 'Кафе и рестораны / Рестораны', weight: 3, min: 8000, max: 45000, payees: ['Del Papa', 'Rumi', 'Gakku'] },
  { category: 'Транспорт / Такси', weight: 8, min: 800, max: 4500, payees: ['Yandex Go', 'inDrive'] },
  { category: 'Транспорт / Топливо', weight: 3, min: 9000, max: 25000, payees: ['Helios', 'Sinooil'] },
  { category: 'Транспорт / Общественный транспорт', weight: 4, min: 120, max: 400, payees: ['Onay'] },
  { category: 'Дом / Ремонт', weight: 1, min: 5000, max: 90000, payees: ['Leroy Merlin', 'Мир ремонта'] },
  { category: 'Дети / Кружки', weight: 2, min: 8000, max: 25000, payees: ['Школа плавания', 'Робототехника'] },
  { category: 'Дети / Одежда', weight: 1, min: 6000, max: 30000, payees: ['Детский мир'] },
  { category: 'Здоровье / Аптека', weight: 4, min: 1200, max: 15000, payees: ['Europharma', 'Биосфера'] },
  { category: 'Здоровье / Врачи', weight: 1, min: 8000, max: 35000, payees: ['Medical Park', 'Invivo'] },
  { category: 'Одежда и обувь', weight: 2, min: 7000, max: 60000, payees: ['Zara', 'LC Waikiki'] },
  { category: 'Развлечения / Кино', weight: 1, min: 2500, max: 8000, payees: ['Kinopark', 'Chaplin'] },
  { category: 'Подарки', weight: 1, min: 5000, max: 60000, payees: ['Flowers.kz', 'Kaspi Магазин'] },
  { category: 'Путешествия', weight: 0.3, min: 60000, max: 450000, payees: ['Air Astana', 'Booking.com'] },
  { category: 'Красота', weight: 1, min: 4000, max: 20000, payees: ['Салон «Персона»', 'Barbershop'] },
  { category: 'Корректировка', weight: 0.15, min: 500, max: 20000, payees: [''] },
  { category: '', weight: 0.4, min: 300, max: 8000, payees: [''] },
];

/** Ежемесячные платежи: день месяца, категория, сумма в тенге, получатель, месяцы (1–12) или `null` — все. */
const MONTHLY: [number, string, number, string, number[] | null][] = [
  [1, 'Дети / Детский сад', 75000, 'Детский сад «Балапан»', [1, 2, 3, 4, 5, 9, 10, 11, 12]],
  [5, 'Дом / Коммунальные услуги', 32000, 'ЕРЦ', null],
  [7, 'Дом / Интернет и связь', 6990, 'Beeline', null],
  [15, 'Развлечения / Подписки', 2490, 'Яндекс Плюс', null],
];

const HEADER = 'date;categoryName;payee;comment;outcomeAccountName;outcome;outcomeCurrencyShortTitle;incomeAccountName;income;incomeCurrencyShortTitle;createdDate;changedDate;qrCode';
const RUB_PER_KZT = 1 / 5.6;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rnd: () => number, items: readonly T[], weight: (item: T) => number): T {
  let r = rnd() * items.reduce((sum, item) => sum + weight(item), 0);
  for (const item of items) {
    r -= weight(item);
    if (r <= 0) return item;
  }
  return items[items.length - 1]!;
}

const money = (value: number) => value.toFixed(2).replace('.', ',');
const field = (value: string) => (/[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
const row = (fields: string[]) => fields.map(field).join(';');

function expense(date: string, time: string, category: string, payee: string, account: Account, kzt: number): string {
  const amount = account.currency === 'RUB' ? kzt * RUB_PER_KZT : kzt;
  const stamp = `${date} ${time}`;
  return row([date, category, payee, '', account.name, money(amount), account.currency, '', '0', account.currency, stamp, stamp, '']);
}

function salary(date: string, amount: number): string {
  const stamp = `${date} 09:00:00`;
  return row([date, 'Зарплата', 'ТОО «Ромашка»', '', '', '0', MAIN.currency, MAIN.name, money(amount), MAIN.currency, stamp, stamp, '']);
}

function transfer(date: string, amount: number, from: Account, to: Account): string {
  const stamp = `${date} 12:00:00`;
  return row([date, '', '', 'Перевод между счетами', from.name, money(amount), from.currency, to.name, money(amount), to.currency, stamp, stamp, '']);
}

const season = (month: number) => (month === 12 ? 1.35 : month === 1 ? 0.85 : month >= 6 && month <= 8 ? 1.1 : 1);

const lines = [HEADER];
const end = new Date();
const start = new Date(Date.UTC(end.getUTCFullYear() - 3, end.getUTCMonth(), end.getUTCDate()));

for (const day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
  const date = day.toISOString().slice(0, 10);
  const rnd = seeded(hash(date));
  const month = day.getUTCMonth() + 1;
  const dom = day.getUTCDate();
  const weekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;

  for (const [payDay, category, amount, payee, months] of MONTHLY) {
    if (dom === payDay && (!months || months.includes(month))) lines.push(expense(date, '10:00:00', category, payee, MAIN, amount * (0.95 + rnd() * 0.1)));
  }
  if (dom === 10 || dom === 25) lines.push(salary(date, 325000 + Math.round(rnd() * 20000)));
  if (dom === 12) lines.push(transfer(date, 100000, MAIN, ACCOUNTS[1]!));

  const count = Math.round((weekend ? 6 : 4) * season(month) * (0.6 + rnd() * 0.8));
  for (let i = 0; i < count; i++) {
    const spend = pick(rnd, SPENDS, (s) => s.weight * (s.category === 'Путешествия' && (month === 7 || month === 8) ? 8 : 1) * (s.category === 'Подарки' && month === 12 ? 4 : 1));
    const account = rnd() > 0.04 ? pick(rnd, KZT_ACCOUNTS, (a) => a.weight) : RUB;
    const amount = (spend.min + rnd() * (spend.max - spend.min)) * season(month);
    const time = `${String(8 + Math.floor(rnd() * 14)).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}:00`;
    lines.push(expense(date, time, spend.category, pick(rnd, spend.payees, () => 1), account, amount));
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${lines.join('\n')}\n`, 'utf8');
console.log(`synthetic.csv: ${lines.length - 1} строк → ${OUT}`);
