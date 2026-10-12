import { Button, SegmentedControl, Skeleton } from '@mantine/core';
import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { ApiError } from '../api/errors';
import { DataTable, type TableData } from './DataTable';
import { EmptyState } from './EmptyState';
import classes from './WidgetCard.module.css';

export type WidgetState = 'pending' | 'error' | 'success' | 'empty';

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  state: WidgetState;
  error?: unknown;
  onRetry?: () => void;
  /** Показываем прошлые данные, пока грузятся новые. */
  dimmed?: boolean;
  height?: number;
  empty?: ReactNode;
  table?: TableData;
  className?: string;
  testId?: string;
  children?: ReactNode;
};

export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    return error.status >= 500 ? `Сервер ответил ошибкой ${error.status}. Обычно помогает повторить запрос.` : `Запрос не прошёл (${error.status}). ${error.detail}`;
  }
  return 'Нет связи с сервером. Проверь подключение и повтори.';
}

function WidgetError({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className={classes.error} role="alert">
      <p>{text}</p>
      {onRetry && (
        <Button variant="default" size="xs" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  );
}

/** Ошибка отрисовки остаётся внутри виджета — соседи живут. */
class WidgetBoundary extends Component<{ onRetry?: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Виджет не отрисовался', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <WidgetError
        text="Этот блок не смог отрисоваться."
        onRetry={() => {
          this.setState({ failed: false });
          this.props.onRetry?.();
        }}
      />
    );
  }
}

export function WidgetCard({ title, subtitle, actions, state, error, onRetry, dimmed, height = 240, empty, table, className, testId, children }: Props) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const showToggle = table !== undefined && state === 'success';
  return (
    <section className={className ? `${classes.card} ${className}` : classes.card} data-testid={testId} aria-busy={state === 'pending'}>
      <header className={classes.head}>
        <div className={classes.titles}>
          <h2 className={classes.title}>{title}</h2>
          {subtitle && <p className={classes.subtitle}>{subtitle}</p>}
        </div>
        {(actions || showToggle) && (
          <div className={classes.actions}>
            {actions}
            {showToggle && (
              <SegmentedControl
                size="xs"
                value={view}
                onChange={(v) => setView(v === 'table' ? 'table' : 'chart')}
                data={[
                  { value: 'chart', label: 'График' },
                  { value: 'table', label: 'Таблица' },
                ]}
              />
            )}
          </div>
        )}
      </header>
      <WidgetBoundary onRetry={onRetry}>
        {state === 'pending' ? (
          <Skeleton height={height} radius="md" />
        ) : state === 'error' ? (
          <WidgetError text={errorText(error)} onRetry={onRetry} />
        ) : state === 'empty' ? (
          (empty ?? <EmptyState compact title="За этот период данных нет" />)
        ) : view === 'table' && table ? (
          <DataTable {...table} />
        ) : (
          <div className={dimmed ? classes.dimmed : classes.body}>{children}</div>
        )}
      </WidgetBoundary>
    </section>
  );
}
