import { isIsoDate, type IsoDate } from '../domain/dates';

export type BaseSearch = { from?: IsoDate; to?: IsoDate; cur?: string; acc?: string[] };
export type CategorySearch = BaseSearch & { cat?: string };
export type LoginSearch = { expired?: boolean; redirect?: string };

/** TanStack Router разбирает значения как JSON, поэтому `cat=2024` приходит числом. */
const text = (v: unknown): string | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return typeof v === 'string' && v.trim() !== '' ? v : undefined;
};

export function parseBaseSearch(raw: Record<string, unknown>): BaseSearch {
  const out: BaseSearch = {};
  if (isIsoDate(raw.from) && isIsoDate(raw.to) && raw.from <= raw.to) {
    out.from = raw.from;
    out.to = raw.to;
  }
  const cur = text(raw.cur);
  if (cur) out.cur = cur;
  if (Array.isArray(raw.acc)) {
    const acc = [...new Set(raw.acc.map(text).filter((a): a is string => a !== undefined))];
    if (acc.length) out.acc = acc;
  }
  return out;
}

export function parseCategorySearch(raw: Record<string, unknown>): CategorySearch {
  const out: CategorySearch = parseBaseSearch(raw);
  const cat = text(raw.cat);
  if (cat) out.cat = cat;
  return out;
}

export function parseLoginSearch(raw: Record<string, unknown>): LoginSearch {
  const out: LoginSearch = {};
  if (raw.expired === true || raw.expired === 'true' || raw.expired === 1) out.expired = true;
  const redirect = text(raw.redirect);
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) out.redirect = redirect;
  return out;
}
