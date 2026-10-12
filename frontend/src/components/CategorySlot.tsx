import { IconX } from '@tabler/icons-react';
import { Fragment } from 'react';
import { ancestry, splitPath } from '../domain/categories';
import { useDrill } from '../drill/hooks';
import { useRequiredSession } from '../session/store';
import { Token } from './QuerySentence';
import classes from './QuerySentence.module.css';

/** «на Продукты › Супермаркет»: предки поднимают на уровень выше, крестик возвращает к обзору. */
export function CategorySlot({ path }: { path: string }) {
  const { dictionaries } = useRequiredSession();
  const drill = useDrill();
  const chain = ancestry(path, dictionaries.separator);
  return (
    <>
      на{' '}
      {chain.map((p, i) => {
        const name = splitPath(p, dictionaries.separator).at(-1) ?? p;
        return (
          <Fragment key={p}>
            {i > 0 && <span className={classes.sep}> › </span>}
            {i === chain.length - 1 ? (
              <span>{name}</span>
            ) : (
              <Token onClick={() => drill.toCategory(p)} title="На уровень выше">
                {name}
              </Token>
            )}
          </Fragment>
        );
      })}
      <button type="button" className={classes.clear} onClick={() => drill.toOverview()} aria-label="Убрать категорию">
        <IconX size={18} />
      </button>
    </>
  );
}
