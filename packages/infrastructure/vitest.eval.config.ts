import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Calls real model APIs and costs money, so it never runs with `pnpm test`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['evals/**/*.eval.ts'],
    reporters: ['default'],
    silent: false,
  },
  resolve: {
    alias: {
      '@evals': fileURLToPath(new URL('./evals', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
