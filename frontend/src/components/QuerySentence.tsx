import { Button } from '@mantine/core';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import classes from './QuerySentence.module.css';

type Props = { children: ReactNode; onReset?: () => void };

/** Строка-запрос: фильтры и хлебные крошки одним предложением над графиками. */
export function QuerySentence({ children, onReset }: Props) {
  return (
    <div className={classes.bar}>
      <h1 className={classes.sentence}>{children}</h1>
      <div className={classes.aside}>
        {onReset && (
          <Button variant="subtle" color="ink" size="compact-sm" onClick={onReset}>
            Сбросить
          </Button>
        )}
      </div>
    </div>
  );
}

/** Кликабельное слово строки-запроса. `ref` нужен Mantine-таргетам поповеров (React 19 передаёт его как проп). */
export function Token({ className, ...props }: ComponentPropsWithRef<'button'>) {
  return <button type="button" className={className ? `${classes.token} ${className}` : classes.token} {...props} />;
}
