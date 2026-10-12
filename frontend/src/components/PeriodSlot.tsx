import { Button, Popover, Tooltip } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { IconCheck } from '@tabler/icons-react';
import { Fragment, useState } from 'react';
import { matchPreset, PRESETS, presetPeriod, type Period } from '../domain/period';
import { useDrill, useFilters } from '../drill/hooks';
import { periodPhrase } from '../drill/sentence';
import { useRequiredSession } from '../session/store';
import { Token } from './QuerySentence';
import classes from './QuerySentence.module.css';

function PeriodPicker({ onDone }: { onDone: () => void }) {
  const { dictionaries } = useRequiredSession();
  const { period } = useFilters();
  const drill = useDrill();
  const active = matchPreset(period, dictionaries.dateRange);
  const [range, setRange] = useState<[string | null, string | null]>([period.from, period.to]);
  const apply = (p: Period) => {
    drill.setPeriod(p);
    onDone();
  };
  return (
    <div className={classes.picker}>
      <ul className={classes.presets}>
        {PRESETS.map((preset) => (
          <li key={preset.id}>
            <button type="button" className={classes.preset} aria-pressed={preset.id === active} onClick={() => apply(presetPeriod(preset.id, dictionaries.dateRange))}>
              <span className={classes.check}>{preset.id === active && <IconCheck size={16} stroke={3} />}</span>
              {preset.label}
            </button>
          </li>
        ))}
      </ul>
      <div className={classes.custom}>
        <p className={classes.customTitle}>Свой период</p>
        <DatePicker
          type="range"
          allowSingleDateInRange
          value={range}
          onChange={setRange}
          minDate={dictionaries.dateRange.min}
          maxDate={dictionaries.dateRange.max}
          defaultDate={period.from}
        />
        <Button size="xs" disabled={!range[0] || !range[1]} onClick={() => range[0] && range[1] && apply({ from: range[0], to: range[1] })}>
          Показать период
        </Button>
      </div>
    </div>
  );
}

/** Период словами: главное слово открывает выбор, части даты расширяют период («сентября» → весь сентябрь). */
export function PeriodSlot() {
  const { dictionaries } = useRequiredSession();
  const { period } = useFilters();
  const drill = useDrill();
  const [opened, setOpened] = useState(false);
  return (
    <>
      {periodPhrase(period, dictionaries.dateRange).map((part, i) => {
        if (part.kind === 'text') return <Fragment key={i}>{part.text}</Fragment>;
        if (part.kind === 'crumb') {
          return (
            <Tooltip key={i} label={part.hint} openDelay={400}>
              <Token onClick={() => part.target && drill.setPeriod(part.target)}>{part.text}</Token>
            </Tooltip>
          );
        }
        return (
          <Popover key={i} opened={opened} onChange={setOpened} position="bottom-start" width={300} trapFocus>
            <Popover.Target>
              <Token aria-haspopup="dialog" aria-expanded={opened} onClick={() => setOpened((o) => !o)} data-testid="period-token">
                {part.text}
              </Token>
            </Popover.Target>
            <Popover.Dropdown>
              <PeriodPicker onDone={() => setOpened(false)} />
            </Popover.Dropdown>
          </Popover>
        );
      })}
    </>
  );
}
