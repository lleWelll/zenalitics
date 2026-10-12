/** Сколько категорий получают свой цвет. Остальные — «Остальное» (правило dataviz: не больше 6–8 цветов). */
export const COLOR_SLOTS = 6;
export type ColorSlot = number | 'other';

/** Цвет закрепляется за категорией, а не за её местом в текущем рейтинге: на вход — порядок «за всё время». */
export function assignSlots(pathsByImportance: readonly string[]): ReadonlyMap<string, number> {
  return new Map(pathsByImportance.slice(0, COLOR_SLOTS).map((path, slot) => [path, slot]));
}

export const slotOf = (slots: ReadonlyMap<string, number>, path: string): ColorSlot => slots.get(path) ?? 'other';
