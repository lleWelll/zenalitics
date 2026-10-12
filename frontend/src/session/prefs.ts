import { useSyncExternalStore } from 'react';
import { storedValue } from '../lib/storage';

export type Prefs = { currency?: string };

function parsePrefs(raw: unknown): Prefs {
  if (!raw || typeof raw !== 'object') return {};
  const p = raw as Record<string, unknown>;
  const prefs: Prefs = {};
  if (typeof p.currency === 'string') prefs.currency = p.currency;
  return prefs;
}

const prefs = storedValue<Prefs>('zenalitics.prefs', parsePrefs);
export const updatePrefs = (patch: Partial<Prefs>): void => prefs.set({ ...prefs.get(), ...patch });
export const usePrefs = (): Prefs => useSyncExternalStore(prefs.subscribe, prefs.get);
