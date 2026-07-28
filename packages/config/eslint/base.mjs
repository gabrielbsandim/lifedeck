import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/node_modules/**',
      // tsup and vitest both write a temporary module next to their config
      // while loading it and delete it on the way out. A lint running at the
      // same time as a build or a test run (turbo happily schedules both, since
      // a package's lint does not depend on its own build) would otherwise pick
      // one up and then fail with ENOENT when it vanishes mid-run.
      '**/tsup.config.bundled_*.mjs',
      '**/*.timestamp-*.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
)
