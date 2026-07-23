import react from '@lifedeck/config/eslint/react'

export default [
  ...react,
  {
    ignores: [
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      'design/**',
      // The React Native app is linted by its own eslint-config-expo flat config
      // via `turbo run lint`; the root (web/node) config does not apply to it.
      'apps/mobile/**',
    ],
  },
]
