import type { ColorSlot } from '../domain/colors';

/** «Бумага и чернила»: цвет только у данных и у роста/снижения. Значения проверены на контраст (см. спек, раздел 7). */
export type Tokens = {
  paper: string;
  surface: string;
  ink: string;
  ink2: string;
  muted: string;
  rule: string;
  axis: string;
  other: string;
  /** Снижение расходов — хорошо. */
  good: string;
  /** Рост расходов — плохо. */
  bad: string;
  /** Категориальная палитра dataviz, 6 слотов, валидирована для своей поверхности. */
  series: readonly string[];
};

export const LIGHT: Tokens = {
  paper: '#f2f4f3',
  surface: '#fbfcfb',
  ink: '#17201b',
  ink2: '#4a564f',
  muted: '#636f68',
  rule: '#dce2de',
  axis: '#c2cbc5',
  other: '#aeb8b2',
  good: '#006300',
  bad: '#c4312f',
  series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
};

export const DARK: Tokens = {
  paper: '#121614',
  surface: '#1a1f1c',
  ink: '#eef2ef',
  ink2: '#b9c4bd',
  muted: '#8f9b94',
  rule: '#29302c',
  axis: '#3a433e',
  other: '#4f5953',
  good: '#0ca30c',
  bad: '#f07a72',
  series: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'],
};

export const CHART_FONT = '"Onest Variable", system-ui, -apple-system, "Segoe UI", sans-serif';

export const tokensFor = (scheme: 'light' | 'dark'): Tokens => (scheme === 'dark' ? DARK : LIGHT);
export const slotColor = (tokens: Tokens, slot: ColorSlot): string => (slot === 'other' ? tokens.other : (tokens.series[slot] ?? tokens.other));
