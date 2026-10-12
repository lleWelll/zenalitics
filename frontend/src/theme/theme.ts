import { Button, createTheme, Menu, Popover, SegmentedControl, type CSSVariablesResolver, type MantineColorsTuple } from '@mantine/core';
import { CHART_FONT, DARK, LIGHT, type Tokens } from './tokens';

/** Шкала «чернил»: от бумаги до чернил. Основной цвет кнопок и выделения. */
const ink: MantineColorsTuple = ['#f2f4f3', '#dce2de', '#c2cbc5', '#a3ada7', '#7e8a83', '#636f68', '#4a564f', '#2f3a34', '#17201b', '#0c120f'];

export const theme = createTheme({
  fontFamily: CHART_FONT,
  headings: { fontFamily: CHART_FONT, fontWeight: '600' },
  fontSizes: { xs: '12px', sm: '14px', md: '16px', lg: '20px', xl: '28px' },
  // Mantine 9 поднял «medium» до 600 — возвращаем 500, жирный — 600.
  fontWeights: { regular: '400', medium: '500', bold: '600' },
  colors: { ink },
  primaryColor: 'ink',
  primaryShade: { light: 8, dark: 1 },
  autoContrast: true,
  defaultRadius: 'md',
  radius: { xs: '4px', sm: '6px', md: '8px', lg: '14px', xl: '20px' },
  cursorType: 'pointer',
  components: {
    Button: Button.extend({ defaultProps: { radius: 'md' } }),
    SegmentedControl: SegmentedControl.extend({ defaultProps: { radius: 'md' } }),
    Popover: Popover.extend({ styles: { dropdown: { background: 'var(--z-surface)', borderColor: 'var(--z-rule)', borderRadius: 14 } } }),
    Menu: Menu.extend({ styles: { dropdown: { background: 'var(--z-surface)', borderColor: 'var(--z-rule)', borderRadius: 14 } } }),
  },
});

const vars = (t: Tokens): Record<string, string> => ({
  '--z-paper': t.paper,
  '--z-surface': t.surface,
  '--z-ink': t.ink,
  '--z-ink-2': t.ink2,
  '--z-muted': t.muted,
  '--z-rule': t.rule,
  '--z-axis': t.axis,
  '--z-other': t.other,
  '--z-good': t.good,
  '--z-bad': t.bad,
  '--mantine-color-body': t.paper,
  '--mantine-color-text': t.ink,
  '--mantine-color-dimmed': t.muted,
  '--mantine-color-default-border': t.rule,
});

export const cssVariablesResolver: CSSVariablesResolver = () => ({ variables: {}, light: vars(LIGHT), dark: vars(DARK) });
