import createClient from 'openapi-fetch';
import { describe, expect, it, vi } from 'vitest';
import { makeEndpoints } from './endpoints';
import { ApiError, SessionExpiredError } from './errors';
import { RequestQueue } from './queue';
import type { paths } from './schema';

type Reply = { status: number; body: unknown };

function setup(reply: (url: URL) => Reply) {
  const calls: { url: URL; body: unknown }[] = [];
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    const text = await request.text();
    calls.push({ url, body: text ? JSON.parse(text) : undefined });
    const { status, body } = reply(url);
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
  const client = createClient<paths>({ baseUrl: 'http://test', fetch: fetchImpl as typeof fetch });
  const onExpired = vi.fn();
  return { api: makeEndpoints(client, new RequestQueue(1), onExpired), calls, onExpired };
}

const filter = { date_from: '2026-09-01', date_to: '2026-09-30', accounts: [], top_n: 10000 };

describe('endpoints', () => {
  it('top шлёт фильтр в путь сессии и возвращает строки', async () => {
    const rows = [{ rank: 1, category: 'Продукты', currency: 'KZT', tx_count: 3, total: 1500, avg_check: 500, share_pct: 100 }];
    const { api, calls } = setup(() => ({ status: 200, body: rows }));
    await expect(api.top('u-1', filter)).resolves.toEqual(rows);
    expect(calls[0]!.url.pathname).toBe('/api/v1/api/v1/analytic/u-1/outcomes/categories/top');
    expect(calls[0]!.body).toEqual(filter);
  });

  it('404 от аналитики — SessionExpiredError и вызов обработчика', async () => {
    const { api, onExpired } = setup(() => ({ status: 404, body: { detail: 'no connection with uuid: u-1' } }));
    await expect(api.top('u-1', filter)).rejects.toBeInstanceOf(SessionExpiredError);
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('500 от аналитики — ApiError со статусом, сессия не трогается', async () => {
    const { api, onExpired } = setup(() => ({ status: 500, body: 'Internal Server Error' }));
    await expect(api.top('u-1', filter)).rejects.toMatchObject({ status: 500 });
    expect(onExpired).not.toHaveBeenCalled();
  });

  it('exportCsv возвращает текст выгрузки, 400 — ApiError с деталью', async () => {
    const ok = setup(() => ({ status: 200, body: { history: 'date;categoryName\n' } }));
    await expect(ok.api.exportCsv({ login: 'a', password: 'b' })).resolves.toBe('date;categoryName\n');
    const bad = setup(() => ({ status: 400, body: { detail: 'verify auth: not authenticated' } }));
    const error = await bad.api.exportCsv({ login: 'a', password: 'b' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, detail: 'verify auth: not authenticated' });
  });

  it('createConnection передаёт ttl в query и CSV в теле', async () => {
    const { api, calls } = setup(() => ({ status: 200, body: '8f6c1d2e-0000-4000-8000-000000000000' }));
    await expect(api.createConnection('csv-text', 240)).resolves.toBe('8f6c1d2e-0000-4000-8000-000000000000');
    expect(calls[0]!.url.pathname).toBe('/api/v1/api/v1/analytic/connection');
    expect(calls[0]!.url.searchParams.get('ttl')).toBe('240');
    expect(calls[0]!.body).toEqual({ history: 'csv-text' });
  });
});
