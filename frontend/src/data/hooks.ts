import { keepPreviousData, useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '../api';
import type { TopRow } from '../api/endpoints';
import type { Priority } from '../api/queue';
import type { Bucket } from '../domain/buckets';
import { clipPeriod, type DateRange, type Period } from '../domain/period';
import { useRequiredSession } from '../session/store';

/** `top_n`, при котором `top` отдаёт все категории периода. */
export const TOP_ALL = 10_000;

type Ctx = { uuid: string; range: DateRange };
type QueryDef<T> = { queryKey: readonly unknown[]; queryFn: (context: { signal: AbortSignal }) => Promise<T> };

const sorted = (values: readonly string[]): string[] => [...values].sort();
/** Заглушка периода для выключенных запросов. */
const NEVER: Period = { from: '0001-01-01', to: '0001-01-01' };

/**
 * Запрос за период. Ключ кэша — период, обрезанный по данным, поэтому одинаковые фактические
 * запросы делят кэш. Пустое пересечение с данными — ответ без запроса.
 */
function periodQuery<T>(ctx: Ctx, name: string, period: Period, extra: readonly unknown[], empty: T, fetcher: (p: Period, signal: AbortSignal) => Promise<T>): QueryDef<T> {
  const clipped = clipPeriod(period, ctx.range);
  if (!clipped) return { queryKey: [name, ctx.uuid, 'empty'], queryFn: async () => empty };
  return { queryKey: [name, ctx.uuid, clipped.from, clipped.to, ...extra], queryFn: ({ signal }) => fetcher(clipped, signal) };
}

function topQuery(ctx: Ctx, period: Period, accounts: readonly string[], priority: Priority): QueryDef<TopRow[]> {
  const acc = sorted(accounts);
  return periodQuery<TopRow[]>(ctx, 'top', period, [acc], [], (p, signal) =>
    api.top(ctx.uuid, { date_from: p.from, date_to: p.to, accounts: acc, top_n: TOP_ALL }, { priority, signal }),
  );
}

function useCtx(): Ctx {
  const session = useRequiredSession();
  return useMemo(() => ({ uuid: session.uuid, range: session.dictionaries.dateRange }), [session]);
}

/** Срез: все категории за период по всем валютам. `null` — запрос выключен (например, нет прошлого периода). */
export function useSlice(period: Period | null, accounts: readonly string[], priority: Priority = 0): UseQueryResult<TopRow[]> {
  const ctx = useCtx();
  return useQuery({ ...topQuery(ctx, period ?? NEVER, accounts, priority), enabled: period !== null, placeholderData: period ? keepPreviousData : undefined });
}

export function useSlices(period: Period, accountSets: readonly (readonly string[])[], priority: Priority = 2): UseQueryResult<TopRow[]>[] {
  const ctx = useCtx();
  return useQueries({ queries: accountSets.map((acc) => topQuery(ctx, period, acc, priority)) });
}

/** Все расходы за всё время — один раз на сессию, чтобы закрепить цвета за категориями. */
export function useAllTimeSlice(): UseQueryResult<TopRow[]> {
  const ctx = useCtx();
  return useQuery(topQuery(ctx, { from: ctx.range.min, to: ctx.range.max }, [], 0));
}

export type PointState = 'pending' | 'error' | 'success' | 'empty';
export type SeriesPoint<T> = { bucket: Bucket; state: PointState; data: T | undefined };
export type Series<T> = { points: SeriesPoint<T>[]; complete: boolean; failed: boolean; retry: () => void };

/** Ряд по интервалам: запрос на интервал. Интервалы вне данных — пустые, без запроса. */
function useSeries<T>(buckets: readonly Bucket[], ctx: Ctx, make: (span: Period) => QueryDef<T>): Series<T> {
  const defs = buckets.map((b) => (clipPeriod(b.span, ctx.range) ? make(b.span) : null));
  const results = useQueries({ queries: defs.filter((d): d is QueryDef<T> => d !== null) });
  let next = 0;
  const points = buckets.map((bucket, i): SeriesPoint<T> => {
    if (!defs[i]) return { bucket, state: 'empty', data: undefined };
    const r = results[next++]!;
    return { bucket, state: r.isSuccess ? 'success' : r.isError ? 'error' : 'pending', data: r.data };
  });
  return {
    points,
    complete: points.every((p) => p.state === 'success' || p.state === 'empty'),
    failed: points.some((p) => p.state === 'error'),
    retry: () => {
      for (const r of results) if (r.isError) void r.refetch();
    },
  };
}

export function useTopSeries(buckets: readonly Bucket[], accounts: readonly string[], priority: Priority = 1): Series<TopRow[]> {
  const ctx = useCtx();
  return useSeries(buckets, ctx, (span) => topQuery(ctx, span, accounts, priority));
}
