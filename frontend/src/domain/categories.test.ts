import { describe, expect, it } from 'vitest';
import { ancestry, buildTree, detectSeparator, findNode, isWithin, splitPath, sumWithin, topLevelPath } from './categories';

const rows = [
  { category: 'Продукты / Супермаркет', total: 700, tx_count: 7 },
  { category: 'Продукты', total: 100, tx_count: 2 },
  { category: 'Продукты / Рынок', total: 200, tx_count: 3 },
  { category: 'Кафе', total: 500, tx_count: 5 },
  { category: 'Без категории', total: 50, tx_count: 1 },
];

describe('categories', () => {
  it('выбирает самый частый разделитель подкатегорий', () => {
    expect(detectSeparator(['Продукты / Супермаркет', 'Продукты / Рынок', 'Кафе'])).toBe(' / ');
    expect(detectSeparator(['Еда/Кафе', 'Еда/Дом', 'Авто / Бензин'])).toBe('/');
    expect(detectSeparator(['Дом: Ремонт', 'Кафе'])).toBe(': ');
    expect(detectSeparator(['Кафе', 'Продукты'])).toBeNull();
  });

  it('строит дерево: родитель = свои операции + подкатегории, по убыванию суммы', () => {
    const tree = buildTree(rows, ' / ');
    expect(tree.map((n) => [n.path, n.total])).toEqual([['Продукты', 1000], ['Кафе', 500], ['Без категории', 50]]);
    const food = tree[0]!;
    expect(food.own).toEqual({ total: 100, txCount: 2 });
    expect(food.txCount).toBe(12);
    expect(food.children.map((c) => [c.path, c.name, c.depth])).toEqual([
      ['Продукты / Супермаркет', 'Супермаркет', 2],
      ['Продукты / Рынок', 'Рынок', 2],
    ]);
    expect(tree[1]!.own).toEqual({ total: 500, txCount: 5 });
  });

  it('без разделителя дерево плоское', () => {
    expect(buildTree(rows, null).map((n) => n.depth)).toEqual([1, 1, 1, 1, 1]);
  });

  it('ищет узлы, предков и принадлежность', () => {
    const tree = buildTree(rows, ' / ');
    expect(findNode(tree, 'Продукты / Рынок')?.total).toBe(200);
    expect(findNode(tree, 'Нет такой')).toBeNull();
    expect(ancestry('Продукты / Рынок', ' / ')).toEqual(['Продукты', 'Продукты / Рынок']);
    expect(topLevelPath('Продукты / Рынок', ' / ')).toBe('Продукты');
    expect(isWithin('Продукты / Рынок', 'Продукты', ' / ')).toBe(true);
    expect(isWithin('Продуктовый', 'Продукты', ' / ')).toBe(false);
    expect(sumWithin(rows, 'Продукты', ' / ')).toEqual({ total: 1000, txCount: 12 });
    expect(splitPath(' A / B ', ' / ')).toEqual(['A', 'B']);
  });
});
