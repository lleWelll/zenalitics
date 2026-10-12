import createClient from 'openapi-fetch';
import { makeEndpoints } from './endpoints';
import { RequestQueue } from './queue';
import type { paths } from './schema';

let onExpired: () => void = () => {};

/** Кого звать при 404 от аналитики. Ставится один раз в main.tsx. */
export function setSessionExpiredHandler(handler: () => void): void {
  onExpired = handler;
}

const concurrency = Number(import.meta.env.VITE_API_CONCURRENCY ?? '1');

/**
 * Сессия общая для всех вкладок (localStorage), поэтому при параллельности 1 запросы
 * сериализуются и между вкладками — через Web Locks. Где замков нет, очередь работает в пределах вкладки.
 */
const exclusive = <T,>(fn: () => Promise<T>): Promise<T> =>
  concurrency <= 1 && typeof navigator !== 'undefined' && navigator.locks ? (navigator.locks.request('zenalitics-api', fn) as Promise<T>) : fn();

export const apiQueue = new RequestQueue(concurrency, exclusive);

const client = createClient<paths>({
  baseUrl: globalThis.location?.origin ?? '',
  // fetch берётся в момент вызова — так его можно подменить в тестах.
  fetch: (input) => globalThis.fetch(input),
});

export const api = makeEndpoints(client, apiQueue, () => onExpired());
