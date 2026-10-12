import type { QueryClient } from '@tanstack/react-query';
import { clearSession } from './store';

/** Обработчик 404 от аналитики: один переход на вход, сколько бы запросов ни упало одновременно. */
export function createExpireHandler(goToLogin: () => Promise<unknown>, queryClient: QueryClient): () => void {
  let pending = false;
  return () => {
    if (pending) return;
    pending = true;
    clearSession();
    void queryClient.cancelQueries();
    queryClient.clear();
    void Promise.resolve(goToLogin()).finally(() => {
      pending = false;
    });
  };
}
