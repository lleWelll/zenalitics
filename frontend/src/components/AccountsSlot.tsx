import { Checkbox, Popover } from '@mantine/core';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useDrill, useFilters } from '../drill/hooks';
import { accountsPhrase } from '../drill/sentence';
import { Token } from './QuerySentence';
import classes from './QuerySentence.module.css';

/** Пауза после последнего клика, после которой выбор счетов уходит в URL, а значит — в запросы к бэку. */
export const ACCOUNTS_DEBOUNCE_MS = 600;

/** «со всех счетов» → список счетов выбранной валюты с галочками. Галочки отзываются сразу, запрос — после паузы. */
export function AccountsSlot() {
  const { accounts, currencyAccounts } = useFilters();
  const drill = useDrill();
  // Выбор, ещё не ушедший в URL; пустой массив — «все счета».
  const [draft, setDraft] = useState<string[] | null>(null);
  const pending = useRef<{ timer: number; next: string[] } | null>(null);
  const urlKey = accounts.join('\u0000');

  const cancel = () => {
    if (pending.current) window.clearTimeout(pending.current.timer);
    pending.current = null;
  };
  const flush = () => {
    const p = pending.current;
    if (!p) return;
    cancel();
    drill.setAccounts(p.next);
  };
  const schedule = (next: string[]) => {
    cancel();
    setDraft(next);
    pending.current = { next, timer: window.setTimeout(flush, ACCOUNTS_DEBOUNCE_MS) };
  };
  // Выбор изменился снаружи (сброс, смена валюты, наша же запись в URL) — черновик больше не нужен.
  useEffect(() => {
    cancel();
    setDraft(null);
  }, [urlKey]);
  useEffect(() => cancel, []);

  const current = draft ?? accounts;
  const phrase = accountsPhrase(current, currencyAccounts);
  if (currencyAccounts.length <= 1) return <>{phrase}</>;
  const selected = current.length ? current : currencyAccounts;
  const toggle = (name: string) => {
    const next = selected.includes(name) ? selected.filter((a) => a !== name) : [...selected, name];
    schedule(next.length === currencyAccounts.length ? [] : next);
  };
  // ⌘/Ctrl + клик: оставить только этот счёт. Клик по подписи порождает второй, синтетический клик по input уже без
  // модификаторов, а `onChange` модификаторов не знает — поэтому запоминаем их на первом клике, на один тик.
  const soloClick = useRef(false);
  const noteModifier = (e: MouseEvent) => {
    if (!e.metaKey && !e.ctrlKey) return;
    soloClick.current = true;
    window.setTimeout(() => (soloClick.current = false), 0);
  };
  const change = (name: string) => {
    if (soloClick.current) {
      soloClick.current = false;
      schedule([name]);
    } else toggle(name);
  };
  return (
    <Popover position="bottom-start" width={260} onClose={flush}>
      <Popover.Target>
        <Token aria-haspopup="dialog">{phrase}</Token>
      </Popover.Target>
      <Popover.Dropdown>
        <div className={classes.checklist}>
          <Checkbox label="Все счета" checked={current.length === 0} onChange={() => schedule([])} />
          {currencyAccounts.map((name) => (
            <Checkbox key={name} label={name} checked={selected.includes(name)} onChange={() => change(name)} onClickCapture={noteModifier} />
          ))}
          <p className={classes.hint}>⌘ / Ctrl + клик — только этот счёт</p>
        </div>
      </Popover.Dropdown>
    </Popover>
  );
}
