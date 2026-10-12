import type { EChartsCoreOption } from 'echarts/core';
import { useEffect, useMemo, useRef } from 'react';
import { EChart } from '../charts/EChart';
import { buildTrendOption, type TrendSeries } from '../charts/trendOption';
import type { Bucket } from '../domain/buckets';
import { formatMoney } from '../domain/format';
import { useTokens } from '../theme/useTokens';
import { Legend } from './Legend';
import { WidgetCard } from './WidgetCard';

type Props = {
  title: string;
  subtitle?: string;
  buckets: readonly Bucket[];
  series: TrendSeries[];
  pending: boolean[];
  failed: boolean;
  onRetry: () => void;
  currency: string;
  average?: { value: number; label: string } | null;
  onBucketClick?: (bucket: Bucket) => void;
  hint?: string;
  className?: string;
  testId?: string;
  height?: number;
};

/** Динамика по интервалам. Пока новый ряд грузится, держит прошлую полную картинку приглушённой — без мигания. */
export function TrendWidget({ title, subtitle, buckets, series, pending, failed, onRetry, currency, average, onBucketClick, hint, className, testId, height = 280 }: Props) {
  const tokens = useTokens();
  const key = buckets.map((b) => b.key).join('|');
  const complete = pending.every((p) => !p);
  const signature = JSON.stringify([key, series.map((s) => [s.key, s.name, s.color, s.values]), pending, average ?? null, hint ?? '', tokens.surface]);
  const option = useMemo(
    () => buildTrendOption({ labels: buckets.map((b) => b.label), titles: buckets.map((b) => b.title), series, pending, currency, average, hint }, tokens),
    // Пересобираем только при смене данных: signature описывает всё, что попадает в опцию.
    [signature],
  );

  const lastComplete = useRef<{ key: string; option: EChartsCoreOption } | null>(null);
  useEffect(() => {
    if (complete) lastComplete.current = { key, option };
  }, [complete, key, option]);
  const previous = lastComplete.current;
  const holding = !complete && previous !== null && previous.key !== key;

  const totals = buckets.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
  const hasData = totals.some((v) => v > 0) || pending.some(Boolean);
  const peak = totals.reduce((best, v, i) => (v > (totals[best] ?? 0) ? i : best), 0);
  const ariaLabel = `${title}. Больше всего за ${buckets[peak]?.title ?? 'период'}: ${formatMoney(totals[peak] ?? 0, currency)}.`;

  const table = {
    caption: title,
    columns: [
      { key: 'bucket', label: 'Интервал' },
      { key: 'total', label: 'Расходы', numeric: true },
      ...(series.length > 1 ? [{ key: 'top', label: 'Больше всего' }] : []),
    ],
    rows: buckets.map((b, i) => {
      const leader = [...series].sort((x, y) => (y.values[i] ?? 0) - (x.values[i] ?? 0))[0];
      const leaderValue = leader?.values[i] ?? 0;
      return {
        bucket: b.title,
        total: formatMoney(totals[i] ?? 0, currency),
        top: leader && leaderValue > 0 ? `${leader.name}, ${formatMoney(leaderValue, currency)}` : '—',
      };
    }),
  };

  return (
    <WidgetCard
      className={className}
      testId={testId}
      title={title}
      subtitle={subtitle}
      state={failed ? 'error' : hasData ? 'success' : 'empty'}
      onRetry={onRetry}
      table={complete ? table : undefined}
      dimmed={holding}
    >
      {series.length > 1 && <Legend items={series.map((s) => ({ key: s.key, name: s.name, color: s.color }))} />}
      <EChart
        option={holding && previous ? previous.option : option}
        height={height}
        ariaLabel={ariaLabel}
        columnClicks={!!onBucketClick}
        testId={testId ? `${testId}-chart` : undefined}
        onClick={(e) => {
          if (holding || e.kind !== 'column' || pending[e.index]) return;
          const bucket = buckets[e.index];
          if (bucket) onBucketClick?.(bucket);
        }}
      />
    </WidgetCard>
  );
}
