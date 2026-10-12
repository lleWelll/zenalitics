/** Только для разработки: синтетическая выгрузка, которую отдаёт dev-сервер Vite (см. vite.config.ts). */
export async function loadDevCsv(): Promise<string> {
  const res = await fetch('/__dev/synthetic.csv');
  if (!res.ok) throw new Error('Нет dev-data/synthetic.csv. Запусти `npm run fixture`.');
  return res.text();
}
