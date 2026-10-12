import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setSessionExpiredHandler } from '../api';
import { saveSession } from '../session/store';
import { mockFetch, renderApp } from '../test/renderApp';
import { ACCOUNTS_DEBOUNCE_MS } from './AccountsSlot';

vi.mock('../charts/EChart', () => ({ EChart: () => null })); // в jsdom нет canvas

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const realFetch = globalThis.fetch;

beforeEach(() => {
  saveSession({
    uuid: 'u-1',
    loadedAt: Date.now(),
    expiresAt: Date.now() + 3_600_000,
    dictionaries: {
      accounts: [
        { name: 'Kaspi Gold', currency: 'KZT' },
        { name: 'Halyk', currency: 'KZT' },
        { name: 'Наличные', currency: 'KZT' },
      ],
      currencies: ['KZT'],
      categories: ['Кафе'],
      dateRange: { min: '2026-01-01', max: '2026-09-30' },
      separator: ' / ',
    },
  });
  mockFetch(() => ({ status: 200, body: [] }));
});
afterEach(() => {
  globalThis.fetch = realFetch;
  setSessionExpiredHandler(() => {});
});

describe('AccountsSlot', () => {
  it('галочки отзываются сразу, а выбор уходит в URL после паузы, которая обновляется кликом', async () => {
    const { router } = renderApp('/?from=2026-09-01&to=2026-09-30');
    await userEvent.click(await screen.findByRole('button', { name: 'со всех счетов' }));

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Kaspi Gold' }));
    expect(screen.getByLabelText('Kaspi Gold')).not.toBeChecked();
    expect(router.state.location.search).not.toHaveProperty('acc');

    await sleep(ACCOUNTS_DEBOUNCE_MS * 0.6);
    await userEvent.click(screen.getByLabelText('Halyk'));
    // С первого клика прошло больше паузы, но второй клик её обновил.
    await sleep(ACCOUNTS_DEBOUNCE_MS * 0.6);
    expect(router.state.location.search).not.toHaveProperty('acc');

    await waitFor(() => expect(router.state.location.search).toMatchObject({ acc: ['Наличные'] }));
    expect(screen.getByLabelText('Наличные')).toBeChecked();
    expect(screen.getByLabelText('Halyk')).not.toBeChecked();
  });

  it('⌘ + клик по пустому и по отмеченному чекбоксу оставляет только этот счёт', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/?from=2026-09-01&to=2026-09-30');
    await user.click(await screen.findByRole('button', { name: 'со всех счетов' }));
    await screen.findByLabelText('Halyk');

    // Сначала снимаем Halyk и Kaspi Gold — остаётся «Наличные».
    await user.click(screen.getByLabelText('Halyk'));
    await user.click(screen.getByLabelText('Kaspi Gold'));
    expect(screen.getByLabelText('Halyk')).not.toBeChecked();

    // ⌘ + клик по пустому чекбоксу: он включается, остальные выключаются — за один клик.
    await user.keyboard('{Meta>}');
    await user.click(screen.getByLabelText('Halyk'));
    await user.keyboard('{/Meta}');
    expect(screen.getByLabelText('Halyk')).toBeChecked();
    expect(screen.getByLabelText('Kaspi Gold')).not.toBeChecked();
    expect(screen.getByLabelText('Наличные')).not.toBeChecked();

    // Ctrl + клик по уже отмеченному: остаётся отмеченным, остальные выключены.
    await user.keyboard('{Control>}');
    await user.click(screen.getByLabelText('Наличные'));
    await user.keyboard('{/Control}');
    expect(screen.getByLabelText('Наличные')).toBeChecked();
    expect(screen.getByLabelText('Halyk')).not.toBeChecked();

    await waitFor(() => expect(router.state.location.search).toMatchObject({ acc: ['Наличные'] }));
  });
});
