import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveSession } from '../session/store';
import { mockFetch, renderApp } from '../test/renderApp';

vi.mock('../charts/EChart', () => ({ EChart: () => null }));

const TOP = [
  { rank: 1, category: 'Продукты / Супермаркет', currency: 'KZT', tx_count: 3, total: 700, avg_check: 233.33, share_pct: 46.7 },
  { rank: 2, category: 'Продукты / Рынок', currency: 'KZT', tx_count: 2, total: 200, avg_check: 100, share_pct: 13.3 },
  { rank: 3, category: 'Продукты', currency: 'KZT', tx_count: 1, total: 100, avg_check: 100, share_pct: 6.7 },
  { rank: 4, category: 'Кафе', currency: 'KZT', tx_count: 5, total: 500, avg_check: 100, share_pct: 33.3 },
];

const realFetch = globalThis.fetch;
beforeEach(() => {
  saveSession({
    uuid: 'u-1',
    loadedAt: Date.now(), expiresAt: Date.now() + 3_600_000,
    dictionaries: {
      accounts: [{ name: 'Kaspi Gold', currency: 'KZT' }, { name: 'Наличные', currency: 'KZT' }],
      currencies: ['KZT'],
      categories: TOP.map((r) => r.category),
      dateRange: { min: '2026-01-01', max: '2026-09-30' },
      separator: ' / ',
    },
  });
  mockFetch(() => ({ status: 200, body: TOP }));
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('Категория', () => {
  it('родитель: сумма поддерева, подкатегории, «без подкатегории» не кликается', async () => {
    renderApp('/category?cat=Продукты&from=2026-09-01&to=2026-09-30');
    expect(await screen.findByTestId('hero-value')).toHaveTextContent(/1\s000\s₸/);
    const subs = await screen.findByTestId('subcategories');
    expect(within(subs).getByRole('button', { name: /Супермаркет/ })).toBeInTheDocument();
    expect(within(subs).getByText('без подкатегории').closest('button')).toBeNull();
  });

  it('клик по подкатегории проваливает глубже, крошка родителя поднимает обратно', async () => {
    const { router } = renderApp('/category?cat=Продукты&from=2026-09-01&to=2026-09-30');
    await userEvent.click(within(await screen.findByTestId('subcategories')).getByRole('button', { name: /Рынок/ }));
    await waitFor(() => expect(router.state.location.search).toMatchObject({ cat: 'Продукты / Рынок' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Продукты' }));
    await waitFor(() => expect(router.state.location.search).toMatchObject({ cat: 'Продукты' }));
  });

  it('категории нет в периоде — понятная заглушка', async () => {
    renderApp('/category?cat=Путешествия&from=2026-09-01&to=2026-09-30');
    expect(await screen.findByText('За этот период расходов на «Путешествия» нет')).toBeInTheDocument();
  });
});
