import { describe, expect, it } from 'vitest';
import { autoGranularity, makeBuckets } from './buckets';

describe('buckets', () => {
  it('выбирает шаг по длине периода', () => {
    expect(autoGranularity({ from: '2026-09-01', to: '2026-10-01' })).toBe('day'); // 31 день
    expect(autoGranularity({ from: '2026-09-01', to: '2026-10-02' })).toBe('week'); // 32 дня
    expect(autoGranularity({ from: '2026-01-01', to: '2026-07-02' })).toBe('week'); // 183 дня
    expect(autoGranularity({ from: '2026-01-01', to: '2026-07-03' })).toBe('month'); // 184 дня
    expect(autoGranularity({ from: '2023-11-01', to: '2026-10-31' })).toBe('month'); // 36 месяцев
    expect(autoGranularity({ from: '2023-10-01', to: '2026-10-31' })).toBe('year'); // 37 месяцев
  });

  it('дни месяца: подписи числами, тултип с днём недели', () => {
    const b = makeBuckets({ from: '2026-09-01', to: '2026-09-30' });
    expect(b).toHaveLength(30);
    expect(b[0]).toMatchObject({ granularity: 'day', label: '1', title: 'вт, 1 сентября 2026', span: { from: '2026-09-01', to: '2026-09-01' } });
  });

  it('месяцы через год: год подписан на первом месяце и в январе', () => {
    const b = makeBuckets({ from: '2025-11-01', to: '2026-10-31' }, 'month');
    expect(b).toHaveLength(12);
    expect(b.map((x) => x.label).slice(0, 3)).toEqual(['ноя\n2025', 'дек', 'янв\n2026']);
    expect(b[0]!.title).toBe('Ноябрь 2025');
    expect(b[0]!.unit).toEqual({ from: '2025-11-01', to: '2025-11-30' });
  });

  it('недели обрезаются по периоду, а цель провала — полная неделя', () => {
    const b = makeBuckets({ from: '2026-09-03', to: '2026-10-20' }, 'week');
    expect(b[0]).toMatchObject({ unit: { from: '2026-08-31', to: '2026-09-06' }, span: { from: '2026-09-03', to: '2026-09-06' }, label: '31 авг – 6 сен' });
    expect(b.at(-1)).toMatchObject({ unit: { from: '2026-10-19', to: '2026-10-25' }, span: { from: '2026-10-19', to: '2026-10-20' }, label: '19–25 окт' });
    expect(b.at(-1)!.title).toBe('Неделя 19–25 октября 2026');
  });

  it('годы для длинных периодов, ключи уникальны', () => {
    const b = makeBuckets({ from: '2020-03-01', to: '2026-10-10' });
    expect(b.map((x) => x.label)).toEqual(['2020', '2021', '2022', '2023', '2024', '2025', '2026']);
    expect(b[0]!.span).toEqual({ from: '2020-03-01', to: '2020-12-31' });
    expect(new Set(b.map((x) => x.key)).size).toBe(b.length);
  });
});
