import { Skeleton } from '@mantine/core';
import classes from './HeroFigure.module.css';

type Props = { value: string | null; dimmed?: boolean; failed?: boolean };

/** Главная цифра экрана — одна на страницу. При ошибке — прочерк, а не «0 ₸». */
export function HeroFigure({ value, dimmed, failed }: Props) {
  if (failed) {
    return (
      <div className={classes.hero}>
        <p className={`${classes.value} ${classes.dimmed}`} data-testid="hero-error">
          — <span className={classes.failed}>не загрузилось</span>
        </p>
      </div>
    );
  }
  return (
    <div className={classes.hero}>
      {value === null ? (
        <Skeleton height={56} width={280} radius="md" />
      ) : (
        <p className={dimmed ? `${classes.value} ${classes.dimmed}` : classes.value} data-testid="hero-value">
          {value}
        </p>
      )}
    </div>
  );
}
