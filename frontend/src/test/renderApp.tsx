import { createMemoryHistory } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { App } from '../App';
import { queryClient } from '../data/queryClient';
import { createAppRouter, type AppRouter } from '../router';

/** Всё приложение на памяти вместо адресной строки. */
export function renderApp(path: string, opts: { beforeRender?: (router: AppRouter) => void } = {}) {
  queryClient.clear();
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  opts.beforeRender?.(router);
  return { router, ...render(<App router={router} />) };
}

/** Подменяет fetch: ответ выбирается по пути запроса. */
export function mockFetch(reply: (path: string) => { status: number; body: unknown }) {
  const fetchMock = async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const { status, body } = reply(url.pathname);
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
  globalThis.fetch = fetchMock as typeof fetch;
}
