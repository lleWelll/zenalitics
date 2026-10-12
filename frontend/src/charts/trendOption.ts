import type { EChartsCoreOption } from 'echarts/core';
import { formatCompact, formatMoney } from '../domain/format';
import { CHART_FONT, type Tokens } from '../theme/tokens';
import { escapeHtml } from './escape';

export type TrendSeries = { key: string; name: string; color: string; values: (number | null)[] };
export type TrendInput = {
  labels: string[];
  titles: string[];
  series: TrendSeries[];
  /** Интервал ещё грузится — рисуем серую заглушку. */
  pending: boolean[];
  currency: string;
  average?: { value: number; label: string } | null;
  hint?: string;
};

/** Столбцы не толще 24px — оставшееся место в полосе остаётся воздухом (dataviz). */
export const BAR_MAX_WIDTH = 24;

export function tooltipShell(t: Tokens) {
  return {
    confine: true,
    backgroundColor: t.surface,
    borderColor: t.rule,
    borderWidth: 1,
    padding: [10, 12],
    textStyle: { color: t.ink, fontSize: 13, fontFamily: CHART_FONT },
    extraCssText: 'border-radius: 10px; box-shadow: none;',
  };
}

function tooltipHtml(input: TrendInput, totals: number[], i: number, t: Tokens): string {
  const title = `<div style="color:${t.ink2};margin-bottom:4px">${escapeHtml(input.titles[i] ?? '')}</div>`;
  if (input.pending[i]) return `${title}<div style="color:${t.muted}">Загружается…</div>`;
  const total = `<div style="font-size:16px;font-weight:600;margin-bottom:4px">${escapeHtml(formatMoney(totals[i] ?? 0, input.currency))}</div>`;
  const rows =
    input.series.length > 1
      ? input.series
          .map((s) => ({ s, v: s.values[i] ?? 0 }))
          .filter((x) => x.v > 0)
          .sort((a, b) => b.v - a.v)
          .map(
            ({ s, v }) =>
              `<div style="display:flex;justify-content:space-between;gap:16px"><span style="display:flex;align-items:center;gap:8px;color:${t.ink2}"><span style="width:12px;height:2px;border-radius:1px;background:${s.color}"></span>${escapeHtml(s.name)}</span><b style="font-weight:600">${escapeHtml(formatMoney(v, input.currency))}</b></div>`,
          )
          .join('')
      : '';
  const hint = input.hint ? `<div style="color:${t.muted};margin-top:6px;font-size:12px">${escapeHtml(input.hint)}</div>` : '';
  return `<div style="min-width:200px;display:grid;gap:4px">${title}${total}${rows}${hint}</div>`;
}

/** Столбцы по интервалам со стеком по категориям. Чистая функция — проверяется тестами без canvas. */
export function buildTrendOption(input: TrendInput, t: Tokens): EChartsCoreOption {
  const n = input.labels.length;
  const totals = Array.from({ length: n }, (_, i) => input.series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
  const known = totals.filter((_, i) => !input.pending[i]);
  const ghost = Math.max(1, ...known) * 0.35;
  const topIndex = Array.from({ length: n }, (_, i) => {
    for (let s = input.series.length - 1; s >= 0; s--) if ((input.series[s]!.values[i] ?? 0) > 0) return s;
    return -1;
  });

  const bars = input.series.map((s, si) => ({
    id: s.key,
    name: s.name,
    type: 'bar',
    stack: 'total',
    barMaxWidth: BAR_MAX_WIDTH,
    // 1px обводка цветом поверхности даёт 2px зазор между соседними сегментами.
    itemStyle: { color: s.color, borderColor: t.surface, borderWidth: 1 },
    emphasis: { disabled: true },
    data: s.values.map((v, i) => ({
      value: input.pending[i] ? null : (v ?? 0),
      itemStyle: topIndex[i] === si ? { borderRadius: [4, 4, 0, 0] } : undefined,
    })),
    ...(si === 0 && input.average
      ? {
          markLine: {
            silent: true,
            symbol: 'none',
            animation: false,
            lineStyle: { color: t.ink2, width: 1, type: 'solid' },
            // За концом линии, в оставленном справа поле: внутри графика подпись наезжала на столбцы и обрезалась.
            label: { formatter: input.average.label, color: t.ink2, fontSize: 12, lineHeight: 15, position: 'end' },
            data: [{ yAxis: input.average.value }],
          },
        }
      : {}),
  }));

  const pendingBars = {
    id: '__pending',
    name: '',
    type: 'bar',
    stack: 'total',
    barMaxWidth: BAR_MAX_WIDTH,
    silent: true,
    itemStyle: { color: t.rule, borderRadius: [4, 4, 0, 0] },
    data: input.pending.map((p) => (p ? ghost : null)),
  };

  return {
    textStyle: { fontFamily: CHART_FONT },
    animationDuration: 300,
    grid: { left: 4, right: input.average ? 88 : 8, top: 12, bottom: 4, containLabel: true },
    xAxis: {
      type: 'category',
      data: input.labels,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: t.axis } },
      axisLabel: { color: t.muted, fontSize: 12, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      // Расходы не бывают отрицательными: без этого шум плавающей точки (−1e-11) тянет ось на целый шаг вниз.
      min: 0,
      splitNumber: 4,
      axisLabel: { show: known.length > 0, color: t.muted, fontSize: 12, formatter: (v: number) => formatCompact(v) },
      splitLine: { lineStyle: { color: t.rule, width: 1, type: 'solid' } },
    },
    tooltip: {
      ...tooltipShell(t),
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: t.rule, opacity: 0.4 } },
      formatter: (raw: unknown) => {
        const params = (Array.isArray(raw) ? raw : [raw]) as { dataIndex: number }[];
        return tooltipHtml(input, totals, params[0]?.dataIndex ?? 0, t);
      },
    },
    series: [...bars, pendingBars],
  };
}
