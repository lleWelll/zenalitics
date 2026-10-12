import { describe, expect, it } from 'vitest';
import { rowsOf, summarize } from './metrics';

describe('metrics', () => {
  it('rowsOf оставляет строки одной валюты', () => {
    const rows = [{ currency: 'KZT', v: 1 }, { currency: 'RUB', v: 2 }];
    expect(rowsOf(rows, 'RUB')).toEqual([{ currency: 'RUB', v: 2 }]);
    expect(rowsOf(undefined, 'RUB')).toEqual([]);
  });

  it('итог, количество и средний чек', () => {
    expect(summarize([{ total: 1000, tx_count: 4 }, { total: 500, tx_count: 1 }])).toEqual({ total: 1500, txCount: 5, avgCheck: 300 });
    expect(summarize([])).toEqual({ total: 0, txCount: 0, avgCheck: null });
  });
});
