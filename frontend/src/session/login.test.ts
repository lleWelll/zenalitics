import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/errors';
import { loginWithZenMoney } from './login';
import { getSession } from './store';

const CSV = 'date;categoryName;payee;comment;outcomeAccountName;outcome;outcomeCurrencyShortTitle;incomeAccountName;income;incomeCurrencyShortTitle\n2026-09-01;Кафе;;;Kaspi Gold;1200,00;KZT;;0;KZT\n';
const creds = { login: 'me', password: 'pw' };

function fakeApi(overrides: Partial<{ exportCsv: () => Promise<string>; createConnection: () => Promise<string> }> = {}) {
  return {
    exportCsv: vi.fn(overrides.exportCsv ?? (async () => CSV)),
    createConnection: vi.fn(overrides.createConnection ?? (async () => 'u-1')),
  };
}

describe('loginWithZenMoney', () => {
  it('выгрузка → справочники → сессия бэка', async () => {
    const api = fakeApi();
    const steps: string[] = [];
    const session = await loginWithZenMoney(api, creds, (s) => steps.push(s));
    expect(steps).toEqual(['export', 'parse', 'connect']);
    expect(api.exportCsv).toHaveBeenCalledWith(creds);
    expect(api.createConnection).toHaveBeenCalledWith(CSV, 240);
    expect(session.uuid).toBe('u-1');
    expect(getSession()?.dictionaries.accounts).toEqual([{ name: 'Kaspi Gold', currency: 'KZT' }]);
  });

  it('400 от выгрузки — неверный логин или пароль', async () => {
    const api = fakeApi({ exportCsv: async () => Promise.reject(new ApiError(400, 'verify auth: not authenticated')) });
    await expect(loginWithZenMoney(api, creds, () => {})).rejects.toMatchObject({ kind: 'credentials', message: 'Неверный логин или пароль ZenMoney.' });
  });

  it('500 от выгрузки — ZenMoney не отдал данные', async () => {
    const api = fakeApi({ exportCsv: async () => Promise.reject(new ApiError(500, '')) });
    await expect(loginWithZenMoney(api, creds, () => {})).rejects.toMatchObject({ kind: 'zenmoney' });
  });

  it('нет сети — сервер недоступен', async () => {
    const api = fakeApi({ exportCsv: async () => Promise.reject(new TypeError('Failed to fetch')) });
    await expect(loginWithZenMoney(api, creds, () => {})).rejects.toMatchObject({ kind: 'network' });
  });

  it('в выгрузке нет расходов — ошибка формата, сессия не создаётся', async () => {
    const api = fakeApi({ exportCsv: async () => 'date;categoryName;outcomeAccountName;outcome;outcomeCurrencyShortTitle;incomeAccountName\n' });
    await expect(loginWithZenMoney(api, creds, () => {})).rejects.toMatchObject({ kind: 'format' });
    expect(api.createConnection).not.toHaveBeenCalled();
    expect(getSession()).toBeNull();
  });
});
