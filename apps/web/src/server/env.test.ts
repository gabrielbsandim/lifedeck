// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { assertProductionEnv } from '@/server/env'

const VALID = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://user:pass@host/db',
  AUTH_SECRET: 'x'.repeat(32),
  NEXT_PUBLIC_SITE_URL: 'https://www.lifedeck.com.br',
  CRON_SECRET: 'cron-secret',
} satisfies NodeJS.ProcessEnv

describe('assertProductionEnv', () => {
  it('does nothing outside production', () => {
    expect(() => assertProductionEnv({ NODE_ENV: 'development' })).not.toThrow()
  })

  it('passes when every required var is present and valid', () => {
    expect(() => assertProductionEnv(VALID)).not.toThrow()
  })

  it('throws listing each missing variable in production', () => {
    expect(() => assertProductionEnv({ NODE_ENV: 'production' })).toThrow(
      /DATABASE_URL[\s\S]*AUTH_SECRET[\s\S]*NEXT_PUBLIC_SITE_URL[\s\S]*CRON_SECRET/,
    )
  })

  it('rejects an AUTH_SECRET shorter than 32 characters', () => {
    expect(() =>
      assertProductionEnv({ ...VALID, AUTH_SECRET: 'too-short' }),
    ).toThrow(/AUTH_SECRET must be at least 32 characters/)
  })

  it('rejects a non-absolute NEXT_PUBLIC_SITE_URL', () => {
    expect(() =>
      assertProductionEnv({
        ...VALID,
        NEXT_PUBLIC_SITE_URL: 'lifedeck.com.br',
      }),
    ).toThrow(/NEXT_PUBLIC_SITE_URL must be an absolute URL/)
  })
})
