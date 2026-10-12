import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setSessionExpiredHandler } from '../api';
import { queryClient } from '../data/queryClient';
import { createExpireHandler } from '../session/expire';
import { saveSession } from '../session/store';
import { mockFetch, renderApp } from '../test/renderApp';

vi.mock('../charts/EChart', () => ({ EChart: () => null })); // в jsdom нет canvas

const TOP = [
  { rank: 1, category: 'Продукты / Супермаркет', currency: 'KZT', tx_count: 3, total: 1000, avg_check: 333.33, share_pct: 66.7 },
  { rank: 2, category: 'Кафе', currency: 'KZT', tx_count: 2, total: 500, avg_check: 250, share_pct: 33.3 },
];

const realFetch = globalThis.fetch;
beforeEach(() => {
  saveSession({
    uuid: 'u-1',
    loadedAt: Date.now(), expiresAt: Date.now() + 3_600_000,
    dictionaries: {
      accounts: [{ name: 'Kaspi Gold', currency: 'KZT' }],
      currencies: ['KZT'],
      categories: ['Кафе', 'Продукты / Супермаркет'],
      dateRange: { min: '2026-01-01', max: '2026-09-30' },
      separator: ' / ',
    },
  });
});
afterEach(() => {
  globalThis.fetch = realFetch;
  setSessionExpiredHandler(() => {});
});

describe('Обзор', () => {
  it('главная цифра — сумма строк top; клик по категории проваливает в неё', async () => {
    mockFetch((path) => (path.endsWith('/outcomes/categories/top') ? { status: 200, body: TOP } : { status: 500, body: '' }));
    const { router } = renderApp('/?from=2026-09-01&to=2026-09-30');
    expect(await screen.findByTestId('hero-value')).toHaveTextContent(/1\s500\s₸/);
    await userEvent.click(await within(await screen.findByTestId('ranking')).findByRole('button', { name: /Продукты/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/category'));
    expect(router.state.location.search).toMatchObject({ cat: 'Продукты', from: '2026-09-01', to: '2026-09-30' });
  });

  it('расходов за период нет — динозавр и подпись вместо цифр', async () => {
    mockFetch(() => ({ status: 200, body: [] }));
    renderApp('/?from=2026-09-01&to=2026-09-30');
    expect(await screen.findByText('Упс, кажется расходов не было')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Показать/ })).toBeNull();
  });

  it('срез не загрузился — главная цифра не притворяется нулём', async () => {
    mockFetch(() => ({ status: 500, body: 'Internal Server Error' }));
    renderApp('/?from=2026-09-01&to=2026-09-30');
    // 5xx повторяется один раз с задержкой ~1 с — ждём дольше.
    expect(await screen.findByTestId('hero-error', {}, { timeout: 4000 })).toHaveTextContent('не загрузилось');
    expect(screen.queryByTestId('hero-value')).toBeNull();
  });

  it('крошка «2026» в строке-запросе расширяет период до года', async () => {
    mockFetch(() => ({ status: 200, body: TOP }));
    const { router } = renderApp('/?from=2026-09-01&to=2026-09-30');
    await userEvent.click(await screen.findByRole('button', { name: '2026' }));
    await waitFor(() => expect(router.state.location.search).toMatchObject({ from: '2026-01-01', to: '2026-12-31' }));
  });

  it('404 от аналитики — один переход на вход с плашкой', async () => {
    mockFetch(() => ({ status: 404, body: { detail: 'no connection with uuid: u-1' } }));
    const goToLogin = vi.fn();
    const { router } = renderApp('/', {
      beforeRender: (r) => {
        goToLogin.mockImplementation(() => r.navigate({ to: '/login', search: { expired: true } }));
        setSessionExpiredHandler(createExpireHandler(goToLogin, queryClient));
      },
    });
    expect(await screen.findByText('Сессия закончилась')).toBeInTheDocument();
    expect(goToLogin).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toBe('/login');
  });
});
