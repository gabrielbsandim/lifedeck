// Mirrors the design tokens from packages/ui/src/styles.css (@theme). Every
// color resolves through a CSS variable declared in src/global.css, so the same
// class name follows the device light/dark setting exactly like the web does.
// Class names match the web (bg-brand-600, text-ink-900, border-line, ...).
const token = name => `rgb(var(--color-${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        brand: {
          50: token('brand-50'),
          100: token('brand-100'),
          200: token('brand-200'),
          300: token('brand-300'),
          400: token('brand-400'),
          500: token('brand-500'),
          600: token('brand-600'),
          700: token('brand-700'),
          900: token('brand-900'),
          accent: token('brand-accent'),
          'accent-strong': token('brand-accent-strong'),
        },
        ink: {
          200: token('ink-200'),
          300: token('ink-300'),
          400: token('ink-400'),
          500: token('ink-500'),
          600: token('ink-600'),
          700: token('ink-700'),
          800: token('ink-800'),
          900: token('ink-900'),
        },
        line: token('line'),
        surface: token('surface'),
        bg: token('bg'),
        muted: token('muted'),
        inverse: token('inverse'),
        scrim: token('scrim'),
        tile: {
          DEFAULT: token('tile'),
          strong: token('tile-strong'),
        },
        success: {
          DEFAULT: token('success'),
          soft: token('success-soft'),
          line: token('success-line'),
          fg: token('success-fg'),
        },
        danger: {
          DEFAULT: token('danger'),
          soft: token('danger-soft'),
          line: token('danger-line'),
          fg: token('danger-fg'),
        },
        warning: token('warning'),
        violet: {
          500: token('violet-500'),
          soft: token('violet-soft'),
        },
        deck: {
          mid: token('deck-mid'),
          back: token('deck-back'),
        },
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
