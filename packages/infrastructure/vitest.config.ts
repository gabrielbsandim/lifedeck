import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vitest/config'
import { createVitestConfig } from '@taskin/config/vitest/base'

export default mergeConfig(
  defineConfig(
    createVitestConfig({
      environment: 'node',
      coverageExclude: [
        'src/**/*.test.ts',
        'src/**/index.ts',
        'src/**/*.types.ts',
        'src/database/prisma-client.ts',
        'src/database/prisma-task-repository.ts',
        'src/database/prisma-user-repository.ts',
        'src/email/resend-email-sender.ts',
      ],
    }),
  ),
  defineConfig({
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  }),
)
