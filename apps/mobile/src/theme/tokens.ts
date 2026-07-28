// Imperative access to the design tokens, for the places NativeWind cannot
// reach: navigation theming, the status bar, and native props that take a color
// string (placeholderTextColor, ActivityIndicator, react-native-svg fills).
//
// The class-based path (bg-brand-600, text-ink-900, ...) resolves the same
// tokens through the CSS variables in src/global.css, so both follow the device
// light/dark setting. palette.json is the single source for both.
import { useColorScheme } from 'react-native'
import palette from './palette.json'

type TokenName = keyof (typeof palette)['light']

type BrandStep =
  | '50'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '900'

type InkStep = '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'

export type ThemeColors = {
  brand: Record<BrandStep, string> & { accent: string; accentStrong: string }
  ink: Record<InkStep, string>
  line: string
  surface: string
  bg: string
  muted: string
  inverse: string
  scrim: string
  tile: string
  tileStrong: string
  success: string
  successSoft: string
  successFg: string
  danger: string
  dangerSoft: string
  dangerFg: string
  warning: string
  violet: { '500': string; soft: string }
  deck: { mid: string; back: string }
}

function build(scheme: 'light' | 'dark'): ThemeColors {
  const raw = palette[scheme]
  // Stored as "r g b" channels so the CSS variables can take an alpha modifier;
  // native props need a plain color string.
  const c = (name: TokenName) => `rgb(${raw[name].split(' ').join(', ')})`

  return {
    brand: {
      '50': c('brand-50'),
      '100': c('brand-100'),
      '200': c('brand-200'),
      '300': c('brand-300'),
      '400': c('brand-400'),
      '500': c('brand-500'),
      '600': c('brand-600'),
      '700': c('brand-700'),
      '900': c('brand-900'),
      accent: c('brand-accent'),
      accentStrong: c('brand-accent-strong'),
    },
    ink: {
      '200': c('ink-200'),
      '300': c('ink-300'),
      '400': c('ink-400'),
      '500': c('ink-500'),
      '600': c('ink-600'),
      '700': c('ink-700'),
      '800': c('ink-800'),
      '900': c('ink-900'),
    },
    line: c('line'),
    surface: c('surface'),
    bg: c('bg'),
    muted: c('muted'),
    inverse: c('inverse'),
    scrim: c('scrim'),
    tile: c('tile'),
    tileStrong: c('tile-strong'),
    success: c('success'),
    successSoft: c('success-soft'),
    successFg: c('success-fg'),
    danger: c('danger'),
    dangerSoft: c('danger-soft'),
    dangerFg: c('danger-fg'),
    warning: c('warning'),
    violet: { '500': c('violet-500'), soft: c('violet-soft') },
    deck: { mid: c('deck-mid'), back: c('deck-back') },
  }
}

export const lightColors = build('light')
export const darkColors = build('dark')

// Module-level default, used for component default props evaluated outside a
// render (icon `color` mostly). Anything that must invert calls useThemeColors.
export const colors = lightColors

export function useThemeColors(): ThemeColors {
  return useColorScheme() === 'dark' ? darkColors : lightColors
}

export const radii = {
  lg: 8,
  xl: 12,
  '2xl': 16,
  card: 12,
} as const
