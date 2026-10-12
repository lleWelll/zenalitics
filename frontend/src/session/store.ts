import { useSyncExternalStore } from 'react';
import { storedValue } from '../lib/storage';
import type { Dictionaries } from './dictionaries';

export const SESSION_KEY = 'zenalitics.session';
/** Сколько живёт сессия на бэке (параметр `ttl` у `connection`), минут. */
export const SESSION_TTL_MINUTES = 240;

export type Session = { uuid: string; /** Когда выгрузка загружена, мс. */ loadedAt: number; expiresAt: number; dictionaries: Dictionaries };

function parseSession(raw: unknown): Session | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<Session>;
  const d = s.dictionaries;
  const valid =
    typeof s.uuid === 'string' &&
    typeof s.loadedAt === 'number' &&
    typeof s.expiresAt === 'number' &&
    !!d &&
    Array.isArray(d.accounts) &&
    Array.isArray(d.currencies) &&
    Array.isArray(d.categories) &&
    typeof d.dateRange?.min === 'string' &&
    typeof d.dateRange?.max === 'string';
  return valid ? (s as Session) : null;
}

const value = storedValue<Session | null>(SESSION_KEY, parseSession);

export function getSession(now: number = Date.now()): Session | null {
  const session = value.get();
  return session && session.expiresAt > now ? session : null;
}

export const saveSession = (session: Session): void => value.set(session);
export const clearSession = (): void => value.clear();
export const subscribeSession = value.subscribe;

export const useSession = (): Session | null => useSyncExternalStore(value.subscribe, () => getSession());

/** Для страниц за входом: там сессия гарантирована guard'ом роутера. */
export function useRequiredSession(): Session {
  const session = useSession();
  if (!session) throw new Error('Нет сессии: страница открыта мимо проверки входа');
  return session;
}
