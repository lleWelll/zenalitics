import { Button } from '@mantine/core';
import type { ReactNode } from 'react';
import '@fontsource-variable/nunito';
import classes from './EmptyState.module.css';

type Props = { title: string; text?: ReactNode; action?: { label: string; onClick: () => void }; compact?: boolean; illustration?: ReactNode };

/** Пустота — повод действовать: что случилось и что сделать. */
export function EmptyState({ title, text, action, compact, illustration }: Props) {
  const rootClass = [classes.root, compact && classes.compact, illustration && classes.illustrated].filter(Boolean).join(' ');
  return (
    <div className={rootClass} role="status">
      {illustration && <div className={classes.illustration}>{illustration}</div>}
      <p className={classes.title}>{title}</p>
      {text && <p className={classes.text}>{text}</p>}
      {action && (
        <Button variant="default" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
