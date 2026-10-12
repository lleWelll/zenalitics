import { describe, expect, it } from 'vitest';
import type { Dictionaries } from './dictionaries';
import { SESSION_KEY, clearSession, getSession, saveSession } from './store';

const dictionaries: Dictionaries = {
  accounts: [{ name: 'Kaspi Gold', currency: 'KZT' }],
  currencies: ['KZT'],
  categories: ['Кафе'],
  dateRange: { min: '2026-01-01', max: '2026-09-30' },
  separator: null,
};

describe('session store', () => {
  it('сохраняет и отдаёт сессию', () => {
    saveSession({ uuid: 'u-1', loadedAt: Date.now(), expiresAt: Date.now() + 60_000, dictionaries });
    expect(getSession()?.uuid).toBe('u-1');
  });

  it('истёкшую сессию не отдаёт', () => {
    saveSession({ uuid: 'u-1', loadedAt: Date.now(), expiresAt: Date.now() - 1, dictionaries });
    expect(getSession()).toBeNull();
  });

  it('мусор в хранилище — сессии нет', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ uuid: 1 }));
    expect(getSession()).toBeNull();
  });

  it('выход забывает сессию', () => {
    saveSession({ uuid: 'u-1', loadedAt: Date.now(), expiresAt: Date.now() + 60_000, dictionaries });
    clearSession();
    expect(getSession()).toBeNull();
  });
});
