import { describe, expect, it } from 'vitest';
import { LIGHT } from '../theme/tokens';
import { buildTrendOption, type TrendInput } from './trendOption';

const input: TrendInput = {
  labels: ['сен', 'окт', 'ноя'],
  titles: ['Сентябрь 2026', 'Октябрь 2026', 'Ноябрь 2026'],
  series: [
    { key: 'a', name: 'Продукты', color: '#2a78d6', values: [100, 0, null] },
    { key: 'b', name: 'Кафе <script>', color: '#eb6834', values: [50, 70, null] },
  ],
  pending: [false, false, true],
  currency: 'KZT',
};

type Item = { value: number | null; itemStyle?: { borderRadius: number[] } };
type Bar = { id: string; data: (Item | number | null)[] };
const bars = () => (buildTrendOption(input, LIGHT) as { series: Bar[] }).series;

describe('buildTrendOption', () => {
  it('серия на категорию плюс серия-заглушка для загружающихся столбцов', () => {
    const series = bars();
    expect(series.map((s) => s.id)).toEqual(['a', 'b', '__pending']);
    expect(series[2]!.data).toEqual([null, null, 52.5]); // 0,35 × максимум известных итогов (150)
  });

  it('скругляет только верхний ненулевой сегмент столбца', () => {
    const [a, b] = bars();
    const radius = (s: Bar, i: number) => (s.data[i] as Item).itemStyle?.borderRadius;
    expect(radius(a!, 0)).toBeUndefined();
    expect(radius(b!, 0)).toEqual([4, 4, 0, 0]);
    expect(radius(b!, 1)).toEqual([4, 4, 0, 0]);
    expect((a!.data[2] as Item).value).toBeNull();
  });

  it('подпись среднего не обрезается: она за концом линии, справа оставлено место', () => {
    const option = buildTrendOption({ ...input, average: { value: 80, label: 'в среднем\n80 ₸' } }, LIGHT) as {
      grid: { right: number };
      series: { markLine?: { label: { position: string } } }[];
    };
    expect(option.series[0]!.markLine!.label.position).toBe('end');
    expect(option.grid.right).toBeGreaterThanOrEqual(80);
  });

  it('ось Y начинается с нуля: шум плавающей точки не уводит её в минус', () => {
    const noisy = { ...input, series: [...input.series, { key: '__rest', name: 'Остальное', color: '#aeb8b2', values: [-1e-11, 1e-11, null] }] };
    const option = buildTrendOption(noisy, LIGHT) as { yAxis: { min: number } };
    expect(option.yAxis.min).toBe(0);
  });

  it('тултип экранирует названия категорий', () => {
    const option = buildTrendOption(input, LIGHT) as { tooltip: { formatter: (p: unknown) => string } };
    const html = option.tooltip.formatter([{ dataIndex: 0 }]);
    expect(html).toContain('Кафе &lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});
