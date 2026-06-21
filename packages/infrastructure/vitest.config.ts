import { defineConfig } from 'vitest/config'
import { createVitestConfig } from '@taskin/config/vitest/base'

export default defineConfig(
  createVitestConfig({
    environment: 'node',
    coverageExclude: [
      'src/**/*.test.ts',
      'src/**/index.ts',
      'src/**/*.types.ts',
      'src/database/prisma-client.ts',
      'src/database/prisma-task-repository.ts',
      'src/email/resend-email-sender.ts',
    ],
  }),
)
