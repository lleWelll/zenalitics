import { Button } from '@mantine/core';
import { Link } from '@tanstack/react-router';
import { Graphic404 } from '../components/Graphic404';
import classes from './NotFoundPage.module.css';

/** Адрес, которого нет. Живёт вне оболочки, поэтому работает и без входа. */
export function NotFoundPage() {
  return (
    <main className={classes.page}>
      <Graphic404 />
      <h1 className={classes.title}>Такой страницы нет</h1>
      <p className={classes.lead}>Ссылка могла устареть, или адрес набран с ошибкой.</p>
      <Button component={Link} to="/">
        На обзор
      </Button>
    </main>
  );
}
