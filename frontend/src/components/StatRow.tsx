import type { ReactNode } from 'react';
import classes from './StatRow.module.css';

export type Stat = { label: string; value: ReactNode; hint?: ReactNode; onClick?: () => void; testId?: string };

/** Вторичные показатели под главной цифрой: подпись, значение, пояснение. */
export function StatRow({ items }: { items: Stat[] }) {
  return (
    <div className={classes.row}>
      {items.map((s) => {
        const body = (
          <>
            <span className={classes.label}>{s.label}</span>
            <span className={classes.value}>{s.value}</span>
            {s.hint && <span className={classes.hint}>{s.hint}</span>}
          </>
        );
        return s.onClick ? (
          <button key={s.label} type="button" className={`${classes.stat} ${classes.clickable}`} onClick={s.onClick} data-testid={s.testId}>
            {body}
          </button>
        ) : (
          <div key={s.label} className={classes.stat} data-testid={s.testId}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
