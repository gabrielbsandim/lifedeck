import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { createVitestConfig } from '@lifedeck/config/vitest/base'

export default mergeConfig(
  defineConfig(
    createVitestConfig({
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      coverageInclude: ['src/**/*.{ts,tsx}'],
      coverageExclude: ['src/**/*.test.tsx', 'src/**/index.ts'],
    }),
  ),
  defineConfig({
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  }),
)
