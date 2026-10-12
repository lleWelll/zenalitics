import { describe, expect, it, vi } from 'vitest';
import { storedValue } from './storage';

describe('storedValue', () => {
  it('читает, пишет и очищает JSON', () => {
    const value = storedValue('t.key', (raw) => (typeof raw === 'number' ? raw : 0));
    expect(value.get()).toBe(0);
    value.set(5);
    expect(value.get()).toBe(5);
    expect(localStorage.getItem('t.key')).toBe('5');
    value.clear();
    expect(value.get()).toBe(0);
  });

  it('битый JSON читается как пустое значение', () => {
    localStorage.setItem('t.bad', '{oops');
    expect(storedValue('t.bad', (raw) => raw ?? 'пусто').get()).toBe('пусто');
  });

  it('пока хранилище не менялось — тот же объект (нужно для useSyncExternalStore)', () => {
    const value = storedValue('t.obj', (raw) => ({ raw }));
    expect(value.get()).toBe(value.get());
  });

  it('оповещает подписчиков', () => {
    const value = storedValue('t.sub', (raw) => raw);
    const listener = vi.fn();
    const unsubscribe = value.subscribe(listener);
    value.set(1);
    unsubscribe();
    value.set(2);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
