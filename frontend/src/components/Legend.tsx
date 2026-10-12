import classes from './Legend.module.css';

/** Легенда для графиков с несколькими рядами: цвет никогда не единственный носитель смысла. */
export function Legend({ items }: { items: { key: string; name: string; color: string }[] }) {
  return (
    <ul className={classes.legend} aria-label="Легенда">
      {items.map((item) => (
        <li key={item.key}>
          <span className={classes.swatch} style={{ background: item.color }} aria-hidden />
          {item.name}
        </li>
      ))}
    </ul>
  );
}
