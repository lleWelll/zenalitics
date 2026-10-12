import { useNavigate, useSearch } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { Period } from '../domain/period';
import { updatePrefs, usePrefs } from '../session/prefs';
import { useRequiredSession } from '../session/store';
import { resolveFilters, type Filters } from './filters';
import { parseBaseSearch, parseCategorySearch, parseLoginSearch, type BaseSearch } from './search';

const useRawSearch = () => useSearch({ strict: false }) as Record<string, unknown>;

export function useBaseSearch(): BaseSearch {
  const raw = useRawSearch();
  return useMemo(() => parseBaseSearch(raw), [raw]);
}
export function useCategorySearch() {
  const raw = useRawSearch();
  return useMemo(() => parseCategorySearch(raw), [raw]);
}
export function useLoginSearch() {
  const raw = useRawSearch();
  return useMemo(() => parseLoginSearch(raw), [raw]);
}

export function useFilters(): Filters {
  const { dictionaries } = useRequiredSession();
  const search = useBaseSearch();
  const prefs = usePrefs();
  return useMemo(() => resolveFilters(search, dictionaries, prefs), [search, dictionaries, prefs]);
}

/** Все переходы провала. Каждый — push в историю, поэтому «назад» возвращает прошлый срез. */
export function useDrill() {
  const navigate = useNavigate();
  const base = useBaseSearch();
  return useMemo(() => {
    const update = (patch: Partial<BaseSearch>) =>
      void navigate({ to: '.', search: (prev: Record<string, unknown>) => ({ ...prev, ...patch }) });
    return {
      setPeriod: (p: Period) => update({ from: p.from, to: p.to }),
      resetPeriod: () => update({ from: undefined, to: undefined }),
      reset: () => update({ from: undefined, to: undefined, acc: undefined }),
      setAccounts: (acc: string[]) => update({ acc: acc.length ? acc : undefined }),
      setCurrency: (cur: string) => {
        updatePrefs({ currency: cur });
        update({ cur, acc: undefined });
      },
      toCategory: (cat: string) => void navigate({ to: '/category', search: { ...base, cat } }),
      toOverview: (patch: Partial<BaseSearch> = {}) => void navigate({ to: '/', search: { ...base, ...patch } }),
    };
  }, [navigate, base]);
}
