import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { makeBuckets } from '../domain/buckets';
import { saveSession } from '../session/store';
import { useSlice, useTopSeries } from './hooks';

vi.mock('../api', () => ({ api: { top: vi.fn(async () => []) } }));

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  saveSession({
    uuid: 'u-1',
    loadedAt: Date.now(), expiresAt: Date.now() + 3_600_000,
    dictionaries: { accounts: [], currencies: ['KZT'], categories: [], dateRange: { min: '2026-01-01', max: '2026-09-30' }, separator: null },
  });
});

describe('data hooks', () => {
  it('запрашивает период, обрезанный по данным, и отсортированные счета', async () => {
    const { result } = renderHook(() => useSlice({ from: '2026-09-01', to: '2026-10-31' }, ['b', 'a']), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.top).toHaveBeenCalledWith('u-1', { date_from: '2026-09-01', date_to: '2026-09-30', accounts: ['a', 'b'], top_n: 10000 }, expect.objectContaining({ priority: 0 }));
  });

  it('период вне данных не ходит в API', async () => {
    const { result } = renderHook(() => useSlice({ from: '2027-01-01', to: '2027-01-31' }, []), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(api.top).not.toHaveBeenCalled();
  });

  it('null вместо периода — запрос выключен', () => {
    const { result } = renderHook(() => useSlice(null, []), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(api.top).not.toHaveBeenCalled();
  });

  it('ряд: интервалы после конца данных пустые и не запрашиваются', async () => {
    const buckets = makeBuckets({ from: '2026-09-28', to: '2026-10-03' }, 'day');
    const { result } = renderHook(() => useTopSeries(buckets, []), { wrapper });
    await waitFor(() => expect(result.current.complete).toBe(true));
    expect(result.current.points.map((p) => p.state)).toEqual(['success', 'success', 'success', 'empty', 'empty', 'empty']);
    expect(api.top).toHaveBeenCalledTimes(3);
  });
});
