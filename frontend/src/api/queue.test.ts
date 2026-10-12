import { describe, expect, it } from 'vitest';
import { RequestQueue } from './queue';

function deferred<T = void>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('RequestQueue', () => {
  it('при параллельности 1 выполняет задачи строго по одной', async () => {
    const q = new RequestQueue(1);
    let running = 0;
    let maxRunning = 0;
    const task = async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await tick();
      running--;
      return 'ok';
    };
    await expect(Promise.all([q.run(task), q.run(task), q.run(task)])).resolves.toEqual(['ok', 'ok', 'ok']);
    expect(maxRunning).toBe(1);
  });

  it('выполняет не больше N задач одновременно', async () => {
    const q = new RequestQueue(3);
    let running = 0;
    let maxRunning = 0;
    const task = async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await tick();
      running--;
    };
    await Promise.all(Array.from({ length: 7 }, () => q.run(task)));
    expect(maxRunning).toBe(3);
  });

  it('сначала запускает более важный приоритет, внутри приоритета — по порядку', async () => {
    const q = new RequestQueue(1);
    const gate = deferred();
    const order: string[] = [];
    const first = q.run(async () => {
      await gate.promise;
      order.push('first');
    });
    const a = q.run(async () => void order.push('p1-a'), { priority: 1 });
    const b = q.run(async () => void order.push('p1-b'), { priority: 1 });
    const c = q.run(async () => void order.push('p0'), { priority: 0 });
    gate.resolve();
    await Promise.all([first, a, b, c]);
    expect(order).toEqual(['first', 'p0', 'p1-a', 'p1-b']);
  });

  it('выкидывает отменённую задачу, которая ещё не стартовала', async () => {
    const q = new RequestQueue(1);
    const gate = deferred();
    const blocker = q.run(() => gate.promise);
    const ctrl = new AbortController();
    let ran = false;
    const dropped = q.run(
      async () => {
        ran = true;
      },
      { signal: ctrl.signal },
    );
    ctrl.abort();
    await expect(dropped).rejects.toMatchObject({ name: 'AbortError' });
    expect(q.pendingCount).toBe(0);
    gate.resolve();
    await blocker;
    expect(ran).toBe(false);
  });

  it('отмена идущей задачи: вызывающий сразу получает AbortError, но слот занят, пока запрос не завершится', async () => {
    // Бэк дорабатывает начатый запрос даже после разрыва — параллельный запрос к той же сессии вернул бы чужие данные.
    const q = new RequestQueue(1);
    const ctrl = new AbortController();
    const gate = deferred();
    let nextStarted = false;
    const running = q.run(() => gate.promise, { signal: ctrl.signal });
    const next = q.run(async () => {
      nextStarted = true;
    });
    await tick();
    ctrl.abort();
    await expect(running).rejects.toMatchObject({ name: 'AbortError' });
    await tick();
    expect(nextStarted).toBe(false);
    expect(q.activeCount).toBe(1);
    gate.resolve();
    await next;
    expect(nextStarted).toBe(true);
  });

  it('задачи выполняются под общим замком, если он задан (сериализация между вкладками)', async () => {
    const locked: string[] = [];
    const q = new RequestQueue(1, (fn) => {
      locked.push('lock');
      return fn();
    });
    await expect(q.run(async () => 7)).resolves.toBe(7);
    expect(locked).toEqual(['lock']);
  });

  it('сразу отклоняет задачу с уже отменённым сигналом', async () => {
    const q = new RequestQueue(1);
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(q.run(async () => 1, { signal: ctrl.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('продолжает работать после упавшей задачи', async () => {
    const q = new RequestQueue(1);
    await expect(q.run(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(q.run(async () => 42)).resolves.toBe(42);
  });
});
