import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'
import { createVitestConfig } from '@lifedeck/config/vitest/base'

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
        'src/database/prisma-list-repository.ts',
        'src/database/prisma-recurring-task-repository.ts',
        'src/database/prisma-share-link-repository.ts',
        'src/database/prisma-membership-repository.ts',
        'src/database/prisma-email-verification-repository.ts',
        'src/database/prisma-analytics-repository.ts',
        'src/database/prisma-notification-repository.ts',
        'src/database/prisma-api-key-repository.ts',
        'src/database/prisma-health-probe.ts',
        'src/email/resend-email-sender.ts',
        'src/email/console-email-sender.ts',
        'src/auth/google-oauth-provider.ts',
        'src/ai/ai-sdk-list-generator.ts',
        'src/ai/stub-list-generator.ts',
      ],
    }),
  ),
  defineConfig({
    test: {
      exclude: [...configDefaults.exclude, '**/*.integration.test.ts'],
    },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  }),
)
