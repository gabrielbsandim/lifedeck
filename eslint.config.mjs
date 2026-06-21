import react from '@taskin/config/eslint/react'

export default [
  ...react,
  {
    ignores: [
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
    ],
  },
]
