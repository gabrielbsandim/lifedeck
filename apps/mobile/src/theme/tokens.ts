// Typed access to the design tokens for imperative use (navigation theme, status
// bar, native props that NativeWind cannot reach). The color source of truth is
// palette.json, mirrored from packages/ui/src/styles.css.
import palette from './palette.json'

export const colors = palette

export const radii = {
  lg: 8,
  xl: 12,
  '2xl': 16,
  card: 12,
} as const
