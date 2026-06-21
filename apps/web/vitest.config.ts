import { defineConfig, mergeConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { createVitestConfig } from '@taskin/config/vitest/base'

export default mergeConfig(
  createVitestConfig({
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverageInclude: ['src/lib/**/*.{ts,tsx}', 'src/server/**/*.{ts,tsx}'],
    coverageExclude: [
      'src/**/*.test.{ts,tsx}',
      'src/server/container.ts',
      'src/server/api/openapi.ts',
      'src/lib/i18n/messages-provider.tsx',
    ],
  }),
  defineConfig({
    plugins: [react()],
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  }),
)
