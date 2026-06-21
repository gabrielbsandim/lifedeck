import type { UserConfig } from 'vitest/config'

type CoverageThreshold = {
  lines: number
  functions: number
  branches: number
  statements: number
}

const DEFAULT_THRESHOLD: CoverageThreshold = {
  lines: 95,
  functions: 95,
  branches: 95,
  statements: 95,
}

type CreateVitestConfigOptions = {
  environment?: 'node' | 'jsdom'
  setupFiles?: string[]
  coverageInclude?: string[]
  coverageExclude?: string[]
  threshold?: Partial<CoverageThreshold>
}

export function createVitestConfig(
  options: CreateVitestConfigOptions = {},
): UserConfig {
  const {
    environment = 'node',
    setupFiles = [],
    coverageInclude = ['src/**/*.{ts,tsx}'],
    coverageExclude = [
      'src/**/*.test.{ts,tsx}',
      'src/**/index.ts',
      'src/**/*.types.ts',
      'src/**/*.d.ts',
    ],
    threshold = {},
  } = options

  return {
    test: {
      globals: true,
      environment,
      setupFiles,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        include: coverageInclude,
        exclude: coverageExclude,
        thresholds: { ...DEFAULT_THRESHOLD, ...threshold },
      },
    },
  }
}
