import { useMemo } from 'react';
import { buildTree, topLevelPath } from '../domain/categories';
import { assignSlots, slotOf, type ColorSlot } from '../domain/colors';
import { rowsOf } from '../domain/metrics';
import { useRequiredSession } from '../session/store';
import { useAllTimeSlice } from './hooks';

export type CategoryColors = {
  /** Слот категории по её верхнему уровню. */
  top: (path: string) => ColorSlot;
  /** Слот подкатегории внутри родителя. */
  child: (parent: string, child: string) => ColorSlot;
};

/** Цвета закреплены за категориями по сумме за всё время: при смене периода ничего не перекрашивается. */
export function useCategoryColors(currency: string): CategoryColors {
  const { dictionaries } = useRequiredSession();
  const sep = dictionaries.separator;
  const allTime = useAllTimeSlice();
  return useMemo(() => {
    const tree = buildTree(rowsOf(allTime.data, currency), sep);
    const top = assignSlots(tree.map((n) => n.path));
    const children = new Map(tree.map((n) => [n.path, assignSlots(n.children.map((c) => c.path))] as const));
    return {
      top: (path: string) => slotOf(top, topLevelPath(path, sep)),
      child: (parent: string, child: string) => slotOf(children.get(parent) ?? new Map<string, number>(), child),
    };
  }, [allTime.data, currency, sep]);
}
