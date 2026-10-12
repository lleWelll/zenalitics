import { describe, expect, it } from 'vitest';
import { assignSlots, slotOf } from './colors';

describe('colors', () => {
  it('закрепляет 6 слотов за первыми путями, остальное — «Остальное»', () => {
    const slots = assignSlots(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect(slotOf(slots, 'a')).toBe(0);
    expect(slotOf(slots, 'f')).toBe(5);
    expect(slotOf(slots, 'g')).toBe('other');
    expect(slotOf(slots, 'нет')).toBe('other');
  });
});
