import type { EChartsCoreOption } from 'echarts/core';
import { formatMoney, formatPct } from '../domain/format';
import { CHART_FONT, type Tokens } from '../theme/tokens';
import { escapeHtml } from './escape';
import { tooltipShell } from './trendOption';

export type TreemapNode = { name: string; path: string; value: number; color: string; children?: TreemapNode[] };

const INK = '#17201b';
const WHITE = '#ffffff';

function luminance(hex: string): number {
  const v = hex.replace('#', '');
  const channel = (i: number) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/** Подпись внутри цветной плитки: чернила или белый — что контрастнее на этой заливке. */
export function readableOn(fill: string): typeof INK | typeof WHITE {
  const l = luminance(fill);
  const onWhite = 1.05 / (l + 0.05);
  const onInk = (l + 0.05) / (luminance(INK) + 0.05);
  return onInk >= onWhite ? INK : WHITE;
}

/** Структура расходов: родитель → подкатегории. Клики обрабатывает страница (по `data.path`). */
export function buildTreemapOption(nodes: TreemapNode[], currency: string, t: Tokens): EChartsCoreOption {
  const total = nodes.reduce((sum, n) => sum + n.value, 0);
  const toData = (n: TreemapNode): Record<string, unknown> => ({
    name: n.name,
    value: n.value,
    path: n.path,
    itemStyle: { color: n.color },
    label: { color: readableOn(n.color) },
    children: n.children?.map(toData),
  });
  return {
    textStyle: { fontFamily: CHART_FONT },
    tooltip: {
      ...tooltipShell(t),
      formatter: (raw: unknown) => {
        const p = raw as { name: string; value: number; data?: { path?: string } };
        const share = total > 0 ? (p.value / total) * 100 : 0;
        return `<div style="display:grid;gap:4px"><span style="color:${t.ink2}">${escapeHtml(p.data?.path ?? p.name)}</span><b style="font-size:15px">${escapeHtml(formatMoney(p.value, currency))}</b><span style="color:${t.muted}">${escapeHtml(formatPct(share))} всех расходов</span><span style="color:${t.muted};font-size:12px">Нажми, чтобы открыть категорию</span></div>`;
      },
    },
    series: [
      {
        type: 'treemap',
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        label: { show: true, formatter: '{b}', fontSize: 12, overflow: 'truncate' },
        // Полосу заголовка родителя ECharts рисует цветом обводки (поверхности), поэтому подпись — текстом темы.
        upperLabel: { show: true, height: 22, fontSize: 12, fontWeight: 500, color: t.ink2 },
        itemStyle: { borderColor: t.surface },
        levels: [
          { itemStyle: { borderWidth: 0, gapWidth: 3 }, upperLabel: { show: false } },
          { itemStyle: { borderWidth: 2, gapWidth: 2, borderColor: t.surface } },
          { itemStyle: { borderWidth: 0 } },
        ],
        data: nodes.map(toData),
      },
    ],
  };
}
