export type StoredValue<T> = {
  get(): T;
  set(value: T): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
};

/**
 * Значение в localStorage с разбором и валидацией. Если хранилище недоступно (приватный режим,
 * переполнение) — живём в памяти. `get()` возвращает тот же объект, пока сырые данные не изменились.
 */
export function storedValue<T>(key: string, parse: (raw: unknown) => T): StoredValue<T> {
  const listeners = new Set<() => void>();
  let memory: string | null = null;
  let useMemory = false;
  let lastRaw: string | null | undefined;
  let lastValue: T;

  const readRaw = (): string | null => {
    if (useMemory) return memory;
    try {
      return localStorage.getItem(key);
    } catch {
      useMemory = true;
      return memory;
    }
  };
  const writeRaw = (raw: string | null): void => {
    try {
      if (raw === null) localStorage.removeItem(key);
      else localStorage.setItem(key, raw);
    } catch {
      useMemory = true;
    }
    memory = raw;
  };
  const notify = () => listeners.forEach((listener) => listener());

  return {
    get() {
      const raw = readRaw();
      if (raw !== lastRaw) {
        lastRaw = raw;
        let parsed: unknown = null;
        try {
          parsed = raw === null ? null : JSON.parse(raw);
        } catch {
          parsed = null;
        }
        lastValue = parse(parsed);
      }
      return lastValue;
    },
    set(value) {
      writeRaw(JSON.stringify(value));
      notify();
    },
    clear() {
      writeRaw(null);
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key || event.key === null) listener();
      };
      window.addEventListener('storage', onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
      };
    },
  };
}
