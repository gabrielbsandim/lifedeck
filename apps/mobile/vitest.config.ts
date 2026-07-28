import path from 'node:path'
import { defineConfig, mergeConfig } from 'vitest/config'
import { createVitestConfig } from '@lifedeck/config/vitest/base'

// Only the app's pure modules are measured. Screens and components are React
// Native trees that need a native renderer (jest-expo / RNTL) rather than
// jsdom, so they are verified by typecheck + lint and on a device; the logic
// they lean on (date math, calendar ranges, byte decoding, weekday labels)
// lives in these modules and IS covered here, at the workspace-wide 95% gate.
export default mergeConfig(
  defineConfig(
    createVitestConfig({
      environment: 'node',
      coverageInclude: [
        'src/lib/api/dates.ts',
        'src/lib/api/base64.ts',
        'src/lib/calendar/**/*.ts',
        'src/lib/weekdays.ts',
        'src/lib/cn.ts',
        'src/lib/billing/**/*.ts',
      ],
      coverageExclude: ['src/**/*.test.ts'],
    }),
  ),
  defineConfig({
    resolve: {
      // path.resolve, not `new URL(...)`: this file is type-checked with the
      // React Native lib, where the DOM URL and Node's URL are not assignable.
      alias: { '@': path.resolve(__dirname, 'src') },
    },
  }),
)
