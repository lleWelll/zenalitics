import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { createExpireHandler } from './expire';
import { getSession, saveSession } from './store';

describe('createExpireHandler', () => {
  it('сколько бы 404 ни пришло подряд — один переход на вход, сессия забыта', async () => {
    saveSession({ uuid: 'u-1', loadedAt: Date.now(), expiresAt: Date.now() + 60_000, dictionaries: { accounts: [], currencies: [], categories: [], dateRange: { min: '2026-01-01', max: '2026-01-31' }, separator: null } });
    const goToLogin = vi.fn(async () => {});
    const handler = createExpireHandler(goToLogin, new QueryClient());
    handler();
    handler();
    handler();
    expect(goToLogin).toHaveBeenCalledTimes(1);
    expect(getSession()).toBeNull();
  });
});
