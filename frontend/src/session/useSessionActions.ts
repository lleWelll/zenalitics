import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { clearSession } from './store';

export function useSessionActions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMemo(() => {
    const leave = (expired: boolean) => {
      clearSession();
      void queryClient.cancelQueries();
      queryClient.clear();
      void navigate({ to: '/login', search: expired ? { expired: true } : {} });
    };
    return { logout: () => leave(false), expire: () => leave(true) };
  }, [navigate, queryClient]);
}
