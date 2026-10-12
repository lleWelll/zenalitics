import { ActionIcon, Button, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';
import { formatLoadedAt } from '../domain/format';
import { parseBaseSearch } from '../drill/search';
import { useSession } from '../session/store';
import { useSessionActions } from '../session/useSessionActions';
import classes from './AppShell.module.css';

/** При переходе между разделами сохраняем период, валюту и счета. */
const keepBase = (prev: Record<string, unknown>) => parseBaseSearch(prev);

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme('light', { getInitialValueInEffect: false });
  const next = scheme === 'dark' ? 'light' : 'dark';
  return (
    <ActionIcon variant="subtle" color="ink" size="lg" aria-label={next === 'dark' ? 'Включить тёмную тему' : 'Включить светлую тему'} onClick={() => setColorScheme(next)}>
      {scheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}

export function AppShell() {
  const session = useSession();
  const { logout, expire } = useSessionActions();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Категория — это провал из обзора, поэтому «Обзор» остаётся подсвеченным.
  const overviewActive = pathname === '/' || pathname === '/category';

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(expire, Math.max(0, session.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [session, expire]);

  if (!session) return null;

  return (
    <div className={classes.shell}>
      <header className={classes.header}>
        <Link to="/" search={keepBase} className={classes.brand}>
          <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
            <rect width="32" height="32" rx="8" fill="currentColor" />
            <path d="M9 23v-7M16 23V9M23 23v-4" stroke="var(--z-paper)" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
          zenalitics
        </Link>
        <nav className={classes.nav} aria-label="Разделы">
          <Link to="/" search={keepBase} className={overviewActive ? `${classes.link} ${classes.active}` : classes.link} aria-current={overviewActive ? 'page' : undefined}>
            Обзор
          </Link>
        </nav>
        <div className={classes.tools}>
          <span className={classes.loaded} title="Когда загружена выгрузка">
            актуально на {formatLoadedAt(session.loadedAt)}
          </span>
          <ColorSchemeToggle />
          <Button variant="subtle" color="ink" size="compact-sm" onClick={logout}>
            Выйти
          </Button>
        </div>
      </header>
      <main className={classes.main}>
        <Outlet />
      </main>
    </div>
  );
}
