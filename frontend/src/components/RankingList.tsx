import { Button } from '@mantine/core';
import { useState } from 'react';
import { formatMoney, formatPct } from '../domain/format';
import classes from './RankingList.module.css';

export type RankingItem = {
  key: string;
  label: string;
  color: string;
  value: number;
  /** Доля в процентах. */
  share?: number | null;
  secondary?: string;
  onClick?: () => void;
  muted?: boolean;
};

type Props = { items: RankingItem[]; currency: string; limit?: number; ariaLabel: string; testId?: string };

/** Рейтинг строками: каждая строка — кнопка провала, полоса показывает величину. */
export function RankingList({ items, currency, limit = 10, ariaLabel, testId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, limit);
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div data-testid={testId}>
      <ol className={classes.list} aria-label={ariaLabel}>
        {visible.map((item) => {
          const content = (
            <>
              <span className={classes.top}>
                <span className={classes.swatch} style={{ background: item.color }} aria-hidden />
                <span className={classes.label}>{item.label}</span>
                <span className={classes.value}>{formatMoney(item.value, currency)}</span>
              </span>
              <span className={classes.track} aria-hidden>
                <span className={classes.bar} style={{ width: `${(item.value / max) * 100}%`, background: item.color }} />
              </span>
              <span className={classes.meta}>
                {item.share != null && <span>{formatPct(item.share)}</span>}
                {item.secondary && <span>{item.secondary}</span>}
              </span>
            </>
          );
          return (
            <li key={item.key} className={item.muted ? classes.muted : undefined}>
              {item.onClick ? (
                <button type="button" className={classes.row} onClick={item.onClick}>
                  {content}
                </button>
              ) : (
                <div className={classes.row}>{content}</div>
              )}
            </li>
          );
        })}
      </ol>
      {items.length > limit && (
        <Button variant="subtle" color="ink" size="xs" mt={4} onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Свернуть' : `Показать все ${items.length}`}
        </Button>
      )}
    </div>
  );
}
