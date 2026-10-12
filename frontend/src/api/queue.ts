export type Priority = 0 | 1 | 2;
export type Exclusive = <T>(fn: () => Promise<T>) => Promise<T>;

type Entry = {
  task: (signal: AbortSignal) => Promise<unknown>;
  priority: Priority;
  seq: number;
  signal?: AbortSignal;
  onAbort?: () => void;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
};

const abortError = () => new DOMException('Запрос отменён', 'AbortError');

/**
 * Очередь запросов к аналитике. Ограничивает параллельность (в бэке гонка на общем
 * соединении DuckDB), пускает вперёд важное (0 — KPI, 1 — графики, 2 — фон)
 * и выкидывает запросы экрана, с которого ушли.
 */
export class RequestQueue {
  private readonly pending: Entry[] = [];
  private readonly concurrency: number;
  private readonly exclusive: Exclusive;
  private active = 0;
  private seq = 0;

  /** `exclusive` — общий замок вокруг каждой задачи (например, Web Locks между вкладками одной сессии). */
  constructor(concurrency: number, exclusive: Exclusive = (fn) => fn()) {
    this.concurrency = Math.max(1, Math.floor(concurrency) || 1);
    this.exclusive = exclusive;
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  get activeCount(): number {
    return this.active;
  }

  run<T>(task: (signal: AbortSignal) => Promise<T>, opts: { priority?: Priority; signal?: AbortSignal } = {}): Promise<T> {
    const { priority = 1, signal } = opts;
    if (signal?.aborted) return Promise.reject(abortError());
    return new Promise<T>((resolve, reject) => {
      const entry: Entry = {
        task,
        priority,
        seq: this.seq++,
        signal,
        resolve: resolve as (value: unknown) => void,
        reject,
      };
      if (signal) {
        entry.onAbort = () => {
          const index = this.pending.indexOf(entry);
          if (index >= 0) {
            this.pending.splice(index, 1);
            reject(abortError());
          }
        };
        signal.addEventListener('abort', entry.onAbort, { once: true });
      }
      this.pending.push(entry);
      this.pump();
    });
  }

  private pump(): void {
    while (this.active < this.concurrency && this.pending.length > 0) {
      let best = 0;
      for (let i = 1; i < this.pending.length; i++) {
        const candidate = this.pending[i]!;
        const current = this.pending[best]!;
        if (candidate.priority < current.priority || (candidate.priority === current.priority && candidate.seq < current.seq)) best = i;
      }
      this.start(this.pending.splice(best, 1)[0]!);
    }
  }

  /**
   * Начатый запрос не прерываем: бэк всё равно доработает его до конца, и параллельный запрос
   * к той же сессии получил бы чужой результат. Вызывающий сразу получает AbortError, а слот
   * освобождается, только когда запрос действительно завершился.
   */
  private start(entry: Entry): void {
    this.active++;
    let settled = false;
    const giveUp = () => {
      if (settled) return;
      settled = true;
      entry.reject(abortError());
    };
    if (entry.signal) {
      if (entry.onAbort) entry.signal.removeEventListener('abort', entry.onAbort);
      entry.signal.addEventListener('abort', giveUp, { once: true });
    }
    const signal = new AbortController().signal; // никогда не прерывается
    this.exclusive(() => Promise.resolve().then(() => entry.task(signal)))
      .then(
        (value) => {
          if (!settled) entry.resolve(value);
        },
        (error) => {
          if (!settled) entry.reject(error);
        },
      )
      .finally(() => {
        settled = true;
        entry.signal?.removeEventListener('abort', giveUp);
        this.active--;
        this.pump();
      });
  }
}
