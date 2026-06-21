import { defineConfig, mergeConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { createVitestConfig } from '@taskin/config/vitest/base'

export default mergeConfig(
  createVitestConfig({
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverageInclude: ['src/**/*.{ts,tsx}'],
    coverageExclude: ['src/**/*.test.tsx', 'src/**/index.ts'],
  }),
  defineConfig({ plugins: [react()] }),
)
