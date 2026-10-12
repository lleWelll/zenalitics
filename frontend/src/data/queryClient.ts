import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Данные сессии — неизменный снимок выгрузки: однажды загруженное не протухает.
      staleTime: Infinity,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Один повтор только для сетевых ошибок и 5xx; 4xx (включая 404 — истёкшую сессию) не повторяем.
      retry: (failureCount, error) => failureCount < 1 && !(error instanceof ApiError && error.status < 500),
    },
  },
});
