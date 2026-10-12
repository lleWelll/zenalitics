export const rowsOf = <T extends { currency: string }>(rows: readonly T[] | undefined, currency: string): T[] =>
  (rows ?? []).filter((r) => r.currency === currency);

export type Summary = { total: number; txCount: number; avgCheck: number | null };

export function summarize(rows: readonly { total: number; tx_count: number }[]): Summary {
  let total = 0;
  let txCount = 0;
  for (const row of rows) {
    total += row.total;
    txCount += row.tx_count;
  }
  return { total, txCount, avgCheck: txCount > 0 ? total / txCount : null };
}

export const AVG_MONTH_DAYS = 30.44;