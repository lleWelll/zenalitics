import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/errors';
import { theme } from '../theme/theme';
import { RankingList } from './RankingList';
import { WidgetCard } from './WidgetCard';

const wrap = (ui: ReactNode) => render(<MantineProvider theme={theme}>{ui}</MantineProvider>);

function Boom(): never {
  throw new Error('boom');
}

describe('WidgetCard', () => {
  it('падение одного виджета не роняет соседей', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    wrap(
      <>
        <WidgetCard title="Сломанный" state="success">
          <Boom />
        </WidgetCard>
        <WidgetCard title="Живой" state="success">
          <p>данные</p>
        </WidgetCard>
      </>,
    );
    expect(screen.getByText('Этот блок не смог отрисоваться.')).toBeInTheDocument();
    expect(screen.getByText('данные')).toBeInTheDocument();
  });

  it('ошибка 500 — понятный текст и кнопка «Повторить»', async () => {
    const retry = vi.fn();
    wrap(<WidgetCard title="Динамика" state="error" error={new ApiError(500, '')} onRetry={retry} />);
    expect(screen.getByText(/Сервер ответил ошибкой 500/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('переключает «График» и «Таблица»', async () => {
    wrap(
      <WidgetCard title="Динамика" state="success" table={{ caption: 'Динамика', columns: [{ key: 'a', label: 'Месяц' }], rows: [{ a: 'сен' }] }}>
        <p>график</p>
      </WidgetCard>,
    );
    await userEvent.click(screen.getByText('Таблица'));
    expect(screen.getByRole('cell', { name: 'сен' })).toBeInTheDocument();
    expect(screen.queryByText('график')).not.toBeInTheDocument();
  });
});

describe('RankingList', () => {
  it('строки — кнопки, «Показать все» раскрывает хвост', async () => {
    const onClick = vi.fn();
    const items = Array.from({ length: 12 }, (_, i) => ({ key: `c${i}`, label: `Категория ${i}`, color: '#2a78d6', value: 1000 - i, onClick }));
    wrap(<RankingList items={items} currency="KZT" ariaLabel="Категории" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    await userEvent.click(screen.getByRole('button', { name: /Категория 0/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Показать все 12' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
  });
});
