// Mirrors the design tokens from packages/ui/src/styles.css (@theme). The oklch
// source values are converted to sRGB hex in src/theme/palette.json so React
// Native can parse them at runtime. Class names match the web (bg-brand-600,
// text-ink-900, border-line, bg-surface, ...).
const palette = require('./src/theme/palette.json')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: palette.brand,
        ink: palette.ink,
        line: palette.line,
        surface: palette.surface,
        bg: palette.bg,
        success: palette.success,
        danger: palette.danger,
        warning: palette.warning,
        violet: palette.violet,
        deck: palette.deck,
      },
      borderRadius: {
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        card: '12px',
      },
    },
  },
  plugins: [],
}
