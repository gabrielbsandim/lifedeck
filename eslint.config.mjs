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
    ],
  },
]
