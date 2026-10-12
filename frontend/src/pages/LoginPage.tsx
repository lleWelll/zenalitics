import { Alert, Button, PasswordInput, TextInput } from '@mantine/core';
import { IconCheck, IconLoader2 } from '@tabler/icons-react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { plural } from '../domain/format';
import { useLoginSearch } from '../drill/hooks';
import { LOGIN_MESSAGES, LoginError, loginWithZenMoney, startSession, type LoginStep } from '../session/login';
import { SESSION_TTL_MINUTES } from '../session/store';
import classes from './LoginPage.module.css';

const STEPS: { id: LoginStep; label: string }[] = [
  { id: 'export', label: 'Загружаем выгрузку из ZenMoney' },
  { id: 'parse', label: 'Разбираем счета и категории' },
  { id: 'connect', label: 'Готовим аналитику' },
];

const TTL_HOURS = SESSION_TTL_MINUTES / 60;

function useElapsedSeconds(running: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    setSeconds(0);
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  return seconds;
}

export function LoginPage() {
  const search = useLoginSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<LoginStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = step !== null;
  const seconds = useElapsedSeconds(busy);

  async function run(action: (onStep: (step: LoginStep) => void) => Promise<unknown>) {
    setError(null);
    try {
      await action(setStep);
      if (search.redirect) router.history.push(search.redirect);
      else await navigate({ to: '/' });
    } catch (e) {
      setError(e instanceof LoginError ? e.message : import.meta.env.DEV && e instanceof Error ? e.message : LOGIN_MESSAGES.network);
    } finally {
      setStep(null);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void run((onStep) => loginWithZenMoney(api, { login, password }, onStep));
  }

  // В прод-сборке `import.meta.env.DEV === false`, и сборщик вырезает эту ветку вместе с динамическим импортом.
  const onTestData = import.meta.env.DEV
    ? async () => {
        const { loadDevCsv } = await import('../session/devData');
        void run(async (onStep) => startSession(api, await loadDevCsv(), onStep));
      }
    : null;

  const current = STEPS.findIndex((s) => s.id === step);
  return (
    <main className={classes.page}>
      <div className={classes.card}>
        <div className={classes.brand}>
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
            <rect width="32" height="32" rx="8" fill="currentColor" />
            <path d="M9 23v-7M16 23V9M23 23v-4" stroke="var(--z-surface)" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
          zenalitics
        </div>
        <div>
          <h1 className={classes.title}>Куда уходят деньги</h1>
          <p className={classes.lead}>Войди логином ZenMoney, и мы покажем расходы по периодам, категориям и счетам.</p>
        </div>

        {search.expired && !busy && !error && (
          <Alert color="gray" variant="light" title="Сессия закончилась">
            Войди снова — данные загрузятся заново.
          </Alert>
        )}

        <form className={classes.form} onSubmit={onSubmit}>
          <TextInput label="Логин ZenMoney" autoComplete="username" required value={login} onChange={(e) => setLogin(e.currentTarget.value)} disabled={busy} />
          <PasswordInput label="Пароль" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.currentTarget.value)} disabled={busy} />
          <Button type="submit" size="md" fullWidth loading={busy}>
            Войти
          </Button>
        </form>

        {busy && (
          <ol className={classes.steps} aria-live="polite">
            {STEPS.map((s, i) => (
              <li key={s.id} className={i === current ? classes.stepActive : i < current ? classes.stepDone : undefined}>
                {i < current ? <IconCheck size={16} /> : i === current ? <IconLoader2 size={16} className={classes.spin} /> : <span className={classes.dot} />}
                <span>{s.label}</span>
                {i === current && <span className={classes.seconds}>{seconds} с</span>}
              </li>
            ))}
          </ol>
        )}

        {error && (
          <Alert color="red" variant="light" title="Не получилось войти" role="alert">
            {error}
          </Alert>
        )}

        <p className={classes.note}>
          Пароль уходит в ZenMoney через этот сервер и нигде не сохраняется. Сессия длится {TTL_HOURS} {plural(TTL_HOURS, ['час', 'часа', 'часов'])}.
        </p>

        {onTestData && (
          <Button variant="default" onClick={() => void onTestData()} disabled={busy}>
            Войти с тестовыми данными
          </Button>
        )}
      </div>
    </main>
  );
}
