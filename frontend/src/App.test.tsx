import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from './test/renderApp';

vi.mock('./charts/EChart', () => ({ EChart: () => null })); // в jsdom нет canvas

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const CSV = 'date;categoryName;payee;comment;outcomeAccountName;outcome;outcomeCurrencyShortTitle;incomeAccountName;income;incomeCurrencyShortTitle\n2026-09-01;Кафе;;;Kaspi Gold;1200,00;KZT;;0;KZT\n';

async function fillLogin() {
  await userEvent.type(await screen.findByLabelText(/Логин ZenMoney/), 'me');
  await userEvent.type(screen.getByLabelText(/Пароль/), 'pw');
  await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
}

describe('вход', () => {
  it('неверный логин — понятная ошибка, остаёмся на входе', async () => {
    mockFetch(() => ({ status: 400, body: { detail: 'verify auth: not authenticated' } }));
    const { router } = renderApp('/login');
    await fillLogin();
    expect(await screen.findByText('Неверный логин или пароль ZenMoney.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('успешный вход ведёт на обзор', async () => {
    mockFetch((path) =>
      path.endsWith('/export/raw') ? { status: 200, body: { history: CSV } } : path.endsWith('/connection') ? { status: 200, body: 'u-1' } : { status: 200, body: [] },
    );
    const { router } = renderApp('/login');
    await fillLogin();
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(await screen.findByRole('link', { name: 'Обзор' })).toBeInTheDocument();
  });

  it('без сессии раздел уводит на вход', async () => {
    const { router } = renderApp('/category');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('неизвестный адрес — страница 404 со ссылкой на обзор', async () => {
    renderApp('/net-takoj-stranicy');
    expect(await screen.findByRole('heading', { name: 'Такой страницы нет' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'На обзор' })).toHaveAttribute('href', '/');
  });
});
