import { useReducedMotion } from '@mantine/hooks';
import { BarChart, LineChart, TreemapChart } from 'echarts/charts';
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useEffect, useRef } from 'react';

echarts.use([BarChart, LineChart, TreemapChart, GridComponent, TooltipComponent, MarkLineComponent, CanvasRenderer]);

export type ChartClick = { kind: 'column'; index: number } | { kind: 'item'; data: unknown; dataIndex: number };

type Props = {
  option: echarts.EChartsCoreOption;
  height: number;
  ariaLabel: string;
  onClick?: (event: ChartClick) => void;
  /** Клик по любому месту столбца категориальной оси, а не только по закрашенной части. */
  columnClicks?: boolean;
  testId?: string;
};

/** Тонкая обёртка над ECharts: init/setOption/resize/dispose и клики. */
export function EChart({ option, height, ariaLabel, onClick, columnClicks = false, testId }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const clickRef = useRef(onClick);
  clickRef.current = onClick;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chart = echarts.init(el, undefined, { renderer: 'canvas' });
    chartRef.current = chart;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(el);
    if (columnClicks) {
      const zr = chart.getZr();
      zr.on('click', (e: { offsetX: number; offsetY: number }) => {
        const point = [e.offsetX, e.offsetY];
        if (!chart.containPixel('grid', point)) return;
        const [x] = chart.convertFromPixel('grid', point) as number[];
        if (x !== undefined && Number.isFinite(x)) clickRef.current?.({ kind: 'column', index: Math.round(x) });
      });
      zr.on('mousemove', (e: { offsetX: number; offsetY: number }) => {
        zr.setCursorStyle(clickRef.current && chart.containPixel('grid', [e.offsetX, e.offsetY]) ? 'pointer' : 'default');
      });
    } else {
      chart.on('click', (p) => clickRef.current?.({ kind: 'item', data: (p as { data?: unknown }).data, dataIndex: p.dataIndex }));
    }
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [columnClicks]);

  useEffect(() => {
    chartRef.current?.setOption({ ...option, animation: !reduceMotion }, { notMerge: true });
  }, [option, reduceMotion]);

  return <div ref={ref} role="img" aria-label={ariaLabel} data-testid={testId} style={{ width: '100%', height }} />;
}
