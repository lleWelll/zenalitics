import { useMemo } from 'react';
import { EChart } from '../charts/EChart';
import { buildTreemapOption, type TreemapNode } from '../charts/treemapOption';
import type { TrendSeries } from '../charts/trendOption';
import { AccountsSlot } from '../components/AccountsSlot';
import { CurrencySlot } from '../components/CurrencySlot';
import { EmptyState } from '../components/EmptyState';
import { Graphic404 } from '../components/Graphic404';
import { HeroFigure } from '../components/HeroFigure';
import { PeriodSlot } from '../components/PeriodSlot';
import { QuerySentence } from '../components/QuerySentence';
import { RankingList, type RankingItem } from '../components/RankingList';
import { StatRow, type Stat } from '../components/StatRow';
import { TrendWidget } from '../components/TrendWidget';
import { WidgetCard } from '../components/WidgetCard';
import { useSlice, useTopSeries } from '../data/hooks';
import { useCategoryColors } from '../data/useCategoryColors';
import { autoGranularity, GRANULARITY_TITLES, makeBuckets } from '../domain/buckets';
import { buildTree, type CategoryNode } from '../domain/categories';
import { formatCount, formatMoney, formatOps } from '../domain/format';
import { AVG_MONTH_DAYS, rowsOf, summarize } from '../domain/metrics';
import { effectiveDays, periodUnit } from '../domain/period';
import { useDrill, useFilters } from '../drill/hooks';
import { useRequiredSession } from '../session/store';
import { slotColor } from '../theme/tokens';
import { useTokens } from '../theme/useTokens';
import page from './page.module.css';

export function OverviewPage() {
  const { dictionaries } = useRequiredSession();
  const sep = dictionaries.separator;
  const filters = useFilters();
  const { period, currency, accounts } = filters;
  const drill = useDrill();
  const tokens = useTokens();
  const colors = useCategoryColors(currency);

  const slice = useSlice(period, accounts, 0);
  const isDay = periodUnit(period).kind === 'day';
  const granularity = autoGranularity(period);
  const buckets = useMemo(() => (isDay ? [] : makeBuckets(period, granularity)), [period, isDay, granularity]);
  const series = useTopSeries(buckets, accounts, 1);

  const view = useMemo(() => {
    const rows = rowsOf(slice.data, currency);
    return {
      tree: buildTree(rows, sep),
      summary: summarize(rows),
    };
  }, [slice.data, currency, sep]);

  const { tree, summary } = view;
  const days = effectiveDays(period, dictionaries.dateRange);
  const perDayValue = days > 0 ? summary.total / days : 0;
  const stats: Stat[] = [
    days >= 60
      ? { label: 'В среднем в месяц', value: formatMoney(perDayValue * AVG_MONTH_DAYS, currency) }
      : { label: 'В среднем в день', value: formatMoney(perDayValue, currency) },
    { label: 'Операций', value: formatCount(summary.txCount) },
    ...(summary.avgCheck !== null ? [{ label: 'Средний чек', value: formatMoney(summary.avgCheck, currency) }] : []),
  ];

  // Динамика: стек по категориям с закреплённым цветом, всё остальное — «Остальное».
  const trees = series.points.map((p) => (p.state === 'success' ? buildTree(rowsOf(p.data, currency), sep) : null));
  const valueAt = (i: number, pick: (t: CategoryNode[]) => number) => {
    const t = trees[i];
    return t ? pick(t) : null;
  };
  const present = new Set(trees.flatMap((t) => (t ?? []).map((n) => n.path)));
  const named = [...present].filter((path) => colors.top(path) !== 'other').sort((a, b) => Number(colors.top(a)) - Number(colors.top(b)));
  const trendSeries: TrendSeries[] = named.map((path) => ({
    key: path,
    name: path,
    color: slotColor(tokens, colors.top(path)),
    values: series.points.map((_, i) => valueAt(i, (t) => t.find((n) => n.path === path)?.total ?? 0)),
  }));
  const rest = series.points.map((_, i) => valueAt(i, (t) => t.filter((n) => colors.top(n.path) === 'other').reduce((s, n) => s + n.total, 0)));
  if (rest.some((v) => (v ?? 0) > 0)) trendSeries.push({ key: '__other', name: 'Остальное', color: tokens.other, values: rest });

  const ranking: RankingItem[] = tree.map((n) => ({
    key: n.path,
    label: n.name,
    color: slotColor(tokens, colors.top(n.path)),
    value: n.total,
    share: summary.total > 0 ? (n.total / summary.total) * 100 : null,
    secondary: formatOps(n.txCount),
    onClick: () => drill.toCategory(n.path),
  }));

  const treemap: TreemapNode[] = tree.map((n) => {
    const color = slotColor(tokens, colors.top(n.path));
    const children: TreemapNode[] = n.children.map((c) => ({ name: c.name, path: c.path, value: c.total, color }));
    if (children.length && n.own && n.own.total > 0) children.push({ name: 'без подкатегории', path: n.path, value: n.own.total, color });
    return { name: n.name, path: n.path, value: n.total, color, children: children.length ? children : undefined };
  });
  const treemapKey = JSON.stringify(treemap);
  const treemapOption = useMemo(() => buildTreemapOption(treemap, currency, tokens), [treemapKey, currency, tokens]);

  const sliceState = slice.isError ? 'error' : slice.isPending ? 'pending' : 'success';
  const isEmpty = slice.isSuccess && !slice.isPlaceholderData && summary.total === 0;

  return (
    <div className={page.page}>
      <div className={page.head}>
        <QuerySentence onReset={!filters.isDefaultPeriod || accounts.length > 0 ? drill.reset : undefined}>
          Расходы <AccountsSlot /> <CurrencySlot /> <PeriodSlot />
        </QuerySentence>
        <HeroFigure
          failed={slice.isError}
          value={slice.isPending ? null : formatMoney(summary.total, currency)}
          dimmed={slice.isPlaceholderData}
        />
      </div>

      {isEmpty ? (
        <EmptyState illustration={<Graphic404 width="min(720px, 80%)" decorative />} title="Упс, кажется расходов не было" />
      ) : (
        <>
          {slice.isSuccess && <StatRow items={stats} />}
          <div className={page.grid}>
            {!isDay && (
              <TrendWidget
                className={page.span12}
                testId="trend"
                title={`Расходы ${GRANULARITY_TITLES[granularity]}`}
                buckets={buckets}
                series={trendSeries}
                pending={series.points.map((p) => p.state === 'pending')}
                failed={series.failed}
                onRetry={series.retry}
                currency={currency}
                onBucketClick={(b) => drill.setPeriod(b.unit)}
                hint="Нажми, чтобы открыть этот период"
              />
            )}
            <WidgetCard className={page.span5} title="Категории" state={sliceState} error={slice.error} onRetry={() => void slice.refetch()} dimmed={slice.isPlaceholderData} height={520}>
              <RankingList items={ranking} currency={currency} limit={8} ariaLabel="Категории по сумме расходов" testId="ranking" />
            </WidgetCard>
            <WidgetCard className={page.span7} title="Структура" subtitle="Площадь плитки — доля в расходах" state={sliceState} error={slice.error} onRetry={() => void slice.refetch()} dimmed={slice.isPlaceholderData} height={600}>
              <EChart
                option={treemapOption}
                height={600}
                testId="treemap"
                ariaLabel={`Структура расходов: больше всего ${tree.slice(0, 3).map((n) => n.name).join(', ')}`}
                onClick={(e) => {
                  const path = e.kind === 'item' ? (e.data as { path?: string } | undefined)?.path : undefined;
                  if (path) drill.toCategory(path);
                }}
              />
            </WidgetCard>
          </div>
        </>
      )}
    </div>
  );
}
