import { describe, expect, it } from 'vitest';
import { LIGHT } from '../theme/tokens';
import { buildTreemapOption, readableOn } from './treemapOption';

describe('buildTreemapOption', () => {
  it('узлы несут путь для провала и контрастную подпись', () => {
    const option = buildTreemapOption(
      [{ name: 'Продукты', path: 'Продукты', value: 1000, color: '#eda100', children: [{ name: 'Рынок', path: 'Продукты / Рынок', value: 200, color: '#eda100' }] }],
      'KZT',
      LIGHT,
    ) as { series: { data: { path: string; label: { color: string }; children: { path: string }[] }[] }[] };
    const node = option.series[0]!.data[0]!;
    expect(node.path).toBe('Продукты');
    expect(node.children[0]!.path).toBe('Продукты / Рынок');
    expect(node.label.color).toBe('#17201b');
  });

  it('заголовок родителя — цветом текста темы: его полоса рисуется цветом поверхности, а не заливкой', () => {
    const option = buildTreemapOption(
      [{ name: 'Продукты', path: 'Продукты', value: 1000, color: '#2a78d6', children: [{ name: 'Рынок', path: 'Продукты / Рынок', value: 200, color: '#2a78d6' }] }],
      'KZT',
      LIGHT,
    ) as { series: { upperLabel: { color: string }; data: { upperLabel?: unknown }[] }[] };
    expect(option.series[0]!.upperLabel.color).toBe(LIGHT.ink2);
    expect(option.series[0]!.data[0]!.upperLabel).toBeUndefined();
  });

  it('подпись: тёмная на светлой заливке, белая на тёмной', () => {
    expect(readableOn('#eda100')).toBe('#17201b');
    expect(readableOn('#2a78d6')).toBe('#ffffff');
  });
});
