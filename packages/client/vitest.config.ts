import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vitest/config'
import { createVitestConfig } from '@lifedeck/config/vitest/base'

export default mergeConfig(
  defineConfig(
    createVitestConfig({
      environment: 'node',
      coverageExclude: ['src/**/*.test.ts', 'src/**/index.ts'],
    }),
  ),
  defineConfig({
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  }),
)
