const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Названия категорий и счетов приходят из выгрузки — в HTML тултипов только экранированными. */
export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (ch) => ENTITIES[ch] ?? ch);
