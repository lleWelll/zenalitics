// Проверяет, что бэкенд принимает выгрузку и все три эндпоинта отвечают: `npm run smoke [-- путь/к/выгрузке.csv]`.
// Бэк должен быть запущен: `cd backend && uv run uvicorn zenalitics.main:app --port 8888`.
import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'dev-data/synthetic.csv';
const origin = process.env.API_ORIGIN ?? 'http://127.0.0.1:8888';
const base = `${origin}/api/v1/api/v1/analytic`;

async function post(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${JSON.stringify(data)}`);
  return data;
}

// Ждём сам API: через nginx любой не-API путь сразу отдаёт index.html, а бэк может ещё стартовать (502/503/504).
for (let attempt = 0; ; attempt++) {
  const status = await fetch(`${base}/connection`).then((r) => r.status, () => 0);
  if (status !== 0 && status !== 502 && status !== 503 && status !== 504) break;
  if (attempt > 100) throw new Error(`бэкенд не отвечает на ${origin}`);
  await new Promise((r) => setTimeout(r, 300));
}

const csv = readFileSync(file, 'utf8');
const header = csv.split('\n', 1)[0]!.replace(/"/g, '').split(';');
const accountIndex = header.indexOf('outcomeAccountName');
const account = csv.split('\n').slice(1).map((line) => line.split(';')[accountIndex]?.replace(/"/g, '')).find(Boolean) ?? '';

const uuid = (await post('/connection?ttl=5', { history: csv })) as string;
const year = new Date().getFullYear();
const period = { date_from: `${year}-01-01`, date_to: `${year}-12-31` };
const top = (await post(`/${uuid}/outcomes/categories/top`, { ...period, accounts: [], top_n: 10000 })) as { currency: string }[];
const breakdown = (await post(`/${uuid}/outcomes/categories/breakdown`, { ...period, accounts: [], category_patterns: ['%'] })) as unknown[];
const perDay = await post(`/${uuid}/outcomes/per-day`, { ...period, account, excluded_categories: [] });
console.log({ uuid, topRows: top.length, currencies: [...new Set(top.map((r) => r.currency))], breakdownRows: breakdown.length, account, perDay });
