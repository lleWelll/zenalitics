import { useComputedColorScheme } from '@mantine/core';
import { tokensFor, type Tokens } from './tokens';

/** Токены текущей темы — для canvas-графиков, которым не доступны CSS-переменные. */
export function useTokens(): Tokens {
  return tokensFor(useComputedColorScheme('light', { getInitialValueInEffect: false }));
}
