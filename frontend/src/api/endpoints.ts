import type { Client } from 'openapi-fetch';
import { ApiError, SessionExpiredError, detailOf } from './errors';
import type { Priority, RequestQueue } from './queue';
import type { components, paths } from './schema';

type Schemas = components['schemas'];
export type TopRow = Schemas['OutcomeCategoryTopResponse'];
export type TopFilter = Schemas['OutcomeCategoryTopFilter'];
export type Credentials = Schemas['UserCredentials'];

/**
 * Все пути API — только здесь. Бэк сейчас отдаёт их с двойным префиксом /api/v1/api/v1
 * (префикс задан и в routers/__init__.py, и в каждом роутере). Когда его починят:
 * `npm run gen:api`, затем поправить строки ниже — TypeScript покажет остальное.
 */
export const PATHS = {
  exportRaw: '/api/v1/api/v1/transactions/export/raw',
  connection: '/api/v1/api/v1/analytic/connection',
  top: '/api/v1/api/v1/analytic/{connection_uuid}/outcomes/categories/top',
} as const satisfies Record<string, keyof paths>;

export type ApiClient = Client<paths>;
export type CallOptions = { priority?: Priority; signal?: AbortSignal };

type Result<T> = { data?: T; error?: unknown; response: Response };

function unwrap<T>(result: Result<T>): T {
  if (result.response.ok && result.data !== undefined) return result.data;
  throw new ApiError(result.response.status, detailOf(result.error));
}

export function makeEndpoints(client: ApiClient, queue: RequestQueue, onSessionExpired: () => void) {
  function analytic<T>(call: (signal: AbortSignal) => Promise<Result<T>>, opts: CallOptions): Promise<T> {
    return queue.run(async (signal) => {
      const result = await call(signal);
      if (result.response.status === 404) {
        onSessionExpired();
        throw new SessionExpiredError(detailOf(result.error));
      }
      return unwrap(result);
    }, opts);
  }

  const path = (uuid: string) => ({ path: { connection_uuid: uuid } });

  return {
    async exportCsv(creds: Credentials, signal?: AbortSignal): Promise<string> {
      return unwrap(await client.POST(PATHS.exportRaw, { body: creds, signal })).history;
    },
    async createConnection(csv: string, ttlMinutes: number, signal?: AbortSignal): Promise<string> {
      return unwrap(await client.POST(PATHS.connection, { params: { query: { ttl: ttlMinutes } }, body: { history: csv }, signal }));
    },
    top(uuid: string, filter: TopFilter, opts: CallOptions = {}): Promise<TopRow[]> {
      return analytic<TopRow[]>((signal) => client.POST(PATHS.top, { params: path(uuid), body: filter, signal }), opts);
    },
  };
}

export type Endpoints = ReturnType<typeof makeEndpoints>;
