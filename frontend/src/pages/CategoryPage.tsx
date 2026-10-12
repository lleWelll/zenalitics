import { useMemo } from 'react';
import type { TrendSeries } from '../charts/trendOption';
import { AccountsSlot } from '../components/AccountsSlot';
import { CategorySlot } from '../components/CategorySlot';
import { CurrencySlot } from '../components/CurrencySlot';
import { EmptyState } from '../components/EmptyState';
import { HeroFigure } from '../components/HeroFigure';
import { PeriodSlot } from '../components/PeriodSlot';
import { QuerySentence } from '../components/QuerySentence';
import { RankingList, type RankingItem } from '../components/RankingList';
import { StatRow, type Stat } from '../components/StatRow';
import { TrendWidget } from '../components/TrendWidget';
import { WidgetCard } from '../components/WidgetCard';
import { useSlice, useSlices, useTopSeries } from '../data/hooks';
import { useCategoryColors } from '../data/useCategoryColors';
import { autoGranularity, GRANULARITY_TITLES, makeBuckets } from '../domain/buckets';
import { buildTree, findNode, splitPath, sumWithin, type CategoryNode } from '../domain/categories';
import { formatCount, formatMoney, formatOps, formatPct } from '../domain/format';
import { rowsOf, summarize } from '../domain/metrics';
import { periodUnit, presetPeriod, previousPeriod } from '../domain/period';
import { useCategorySearch, useDrill, useFilters } from '../drill/hooks';
import { periodCompact } from '../drill/sentence';
import { useRequiredSession } from '../session/store';
import { slotColor } from '../theme/tokens';
import { useTokens } from '../theme/useTokens';
import page from './page.module.css';

export function CategoryPage() {
  const { cat } = useCategorySearch();
  const drill = useDrill();
  if (!cat) return <EmptyState title="Категория не выбрана" text="Открой категорию из обзора." action={{ label: 'К обзору', onClick: () => drill.toOverview() }} />;
  return <CategoryView cat={cat} />;
}

function CategoryView({ cat }: { cat: string }) {
  const { dictionaries } = useRequiredSession();
  const sep = dictionaries.separator;
  const filters = useFilters();
  const { period, currency, accounts, currencyAccounts } = filters;
  const drill = useDrill();
  const tokens = useTokens();
  const colors = useCategoryColors(currency);
  const name = splitPath(cat, sep).at(-1) ?? cat;

  const prevPeriod = useMemo(() => previousPeriod(period, dictionaries.dateRange), [period, dictionaries.dateRange]);
  const slice = useSlice(period, accounts, 0);
  const prev = useSlice(prevPeriod, accounts, 0);
  const isDay = periodUnit(period).kind === 'day';
  const granularity = autoGranularity(period);
  const buckets = useMemo(() => (isDay ? [] : makeBuckets(period, granularity)), [period, isDay, granularity]);
  const series = useTopSeries(buckets, accounts, 1);

  const accountList = accounts.length ? accounts : currencyAccounts;
  const accountKey = accountList.join('\u0000');
  const accountSets = useMemo(() => accountList.map((a) => [a]), [accountKey]);
  const perAccount = useSlices(period, accountSets, 2);

  const view = useMemo(() => {
    const rows = rowsOf(slice.data, currency);
    const tree = buildTree(rows, sep);
    const prevRows = prev.data && !prev.isPlaceholderData ? rowsOf(prev.data, currency) : null;
    return {
      tree,
      summary: summarize(rows),
      node: findNode(tree, cat),
      prevTotal: prevRows ? (findNode(buildTree(prevRows, sep), cat)?.total ?? 0) : null,
    };
  }, [slice.data, prev.data, prev.isPlaceholderData, currency, sep, cat]);

  const { node, summary } = view;
  const total = node?.total ?? 0;
  const color = slotColor(tokens, colors.top(cat));
  const notFound = slice.isSuccess && !slice.isPlaceholderData && !node;

  const stats: Stat[] = node
    ? [
        { label: 'Доля от всех расходов', value: formatPct((total / Math.max(1, summary.total)) * 100) },
        { label: 'Операций', value: formatCount(node.txCount), hint: node.txCount > 0 ? `средний чек ${formatMoney(total / node.txCount, currency)}` : undefined },
      ]
    : [];

  // Динамика: у родителя — стек по подкатегориям с закреплённым цветом, остальное — одним слоем.
  const children = node?.children ?? [];
  const named = children.filter((c) => colors.child(cat, c.path) !== 'other').sort((a, b) => Number(colors.child(cat, a.path)) - Number(colors.child(cat, b.path)));
  const nodes = series.points.map((p) => (p.state === 'success' ? findNode(buildTree(rowsOf(p.data, currency), sep), cat) : undefined));
  const valueAt = (i: number, pick: (n: CategoryNode | null) => number) => (nodes[i] === undefined ? null : pick(nodes[i] ?? null));
  const trendSeries: TrendSeries[] =
    children.length === 0
      ? [{ key: cat, name, color, values: series.points.map((_, i) => valueAt(i, (n) => n?.total ?? 0)) }]
      : named.map((c) => ({
          key: c.path,
          name: c.name,
          color: slotColor(tokens, colors.child(cat, c.path)),
          values: series.points.map((_, i) => valueAt(i, (n) => n?.children.find((x) => x.path === c.path)?.total ?? 0)),
        }));
  if (children.length) {
    // «Остальное» — разность сумм: прижимаем к нулю, иначе шум плавающей точки даёт ложный слой.
    const rest = series.points.map((_, i) =>
      valueAt(i, (n) => (n ? Math.max(0, n.total - n.children.filter((x) => named.some((m) => m.path === x.path)).reduce((s, x) => s + x.total, 0)) : 0)),
    );
    if (rest.some((v) => (v ?? 0) >= 1)) trendSeries.push({ key: '__rest', name: 'Остальное', color: tokens.other, values: rest });
  }

  const subItems: RankingItem[] = [
    ...children.map((c) => ({
      key: c.path,
      label: c.name,
      color: slotColor(tokens, colors.child(cat, c.path)),
      value: c.total,
      share: total > 0 ? (c.total / total) * 100 : null,
      secondary: formatOps(c.txCount),
      onClick: () => drill.toCategory(c.path),
    })),
    ...(children.length && node?.own && node.own.total > 0
      ? [{ key: '__own', label: 'без подкатегории', color: tokens.other, value: node.own.total, share: (node.own.total / total) * 100, secondary: formatOps(node.own.txCount), muted: true }]
      : []),
  ].sort((a, b) => b.value - a.value);

  const compareItems: RankingItem[] = [
    { key: 'now', label: periodCompact(period), color, value: total },
    ...(prevPeriod && view.prevTotal !== null ? [{ key: 'prev', label: periodCompact(prevPeriod), color: tokens.other, value: view.prevTotal, muted: true }] : []),
  ];

  const accountItems: RankingItem[] = accountList
    .map((account, i) => {
      const data = perAccount[i]?.data;
      const value = data ? sumWithin(rowsOf(data, currency), cat, sep).total : 0;
      return { key: account, label: account, color, value, share: total > 0 ? (value / total) * 100 : null, onClick: () => drill.setAccounts([account]) };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  const accountsState = perAccount.some((r) => r.isError) ? 'error' : perAccount.every((r) => r.isSuccess) ? (accountItems.length ? 'success' : 'empty') : 'pending';
  const sliceState = slice.isError ? 'error' : slice.isPending ? 'pending' : 'success';

  return (
    <div className={page.page}>
      <div className={page.head}>
        <QuerySentence onReset={!filters.isDefaultPeriod || accounts.length > 0 ? drill.reset : undefined}>
          Расходы <CategorySlot path={cat} /> <AccountsSlot /> <CurrencySlot /> <PeriodSlot />
        </QuerySentence>
        <HeroFigure
          failed={slice.isError}
          value={slice.isPending ? null : formatMoney(total, currency)}
          dimmed={slice.isPlaceholderData}
        />
      </div>

      {notFound ? (
        <EmptyState
          title={`За этот период расходов на «${name}» нет`}
          text="Попробуй период пошире или вернись к обзору."
          action={{ label: 'Показать всё время', onClick: () => drill.setPeriod(presetPeriod('all', dictionaries.dateRange)) }}
        />
      ) : (
        <>
          {node && <StatRow items={stats} />}
          <div className={page.grid}>
            {!isDay && (
              <TrendWidget
                className={page.span12}
                testId="category-trend"
                title={`«${name}» ${GRANULARITY_TITLES[granularity]}`}
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
            {children.length > 0 ? (
              <WidgetCard className={page.span7} title="Подкатегории" state={sliceState} error={slice.error} onRetry={() => void slice.refetch()} dimmed={slice.isPlaceholderData}>
                <RankingList items={subItems} currency={currency} ariaLabel={`Подкатегории «${name}»`} testId="subcategories" />
              </WidgetCard>
            ) : (
              <WidgetCard className={page.span7} title="Сравнение с прошлым периодом" state={prevPeriod === null ? 'empty' : sliceState} empty={<EmptyState compact title="Не с чем сравнить" />}>
                <RankingList items={compareItems} currency={currency} ariaLabel="Этот и прошлый период" />
              </WidgetCard>
            )}
            {accountList.length > 1 && (
              <WidgetCard className={page.span5} title="По счетам" subtitle="Нажми на счёт, чтобы оставить только его" state={accountsState} onRetry={() => perAccount.forEach((r) => r.isError && void r.refetch())}>
                <RankingList items={accountItems} currency={currency} ariaLabel="Счета" testId="category-accounts" />
              </WidgetCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}
