// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isAuthorizedCron } from '@/server/api/cron-guard'

function withAuth(value?: string): Request {
  return new Request('https://lifedeck.app/api/v1/internal/dispatch-jobs', {
    method: 'POST',
    headers: value ? { authorization: value } : {},
  })
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isAuthorizedCron', () => {
  it('denies when no secret is configured', () => {
    expect(isAuthorizedCron(withAuth('Bearer anything'))).toBe(false)
  })

  it('allows a matching bearer secret', () => {
    vi.stubEnv('CRON_SECRET', 's3cret')
    expect(isAuthorizedCron(withAuth('Bearer s3cret'))).toBe(true)
  })

  it('denies a wrong secret', () => {
    vi.stubEnv('CRON_SECRET', 's3cret')
    expect(isAuthorizedCron(withAuth('Bearer nope'))).toBe(false)
  })

  it('denies a missing authorization header', () => {
    vi.stubEnv('CRON_SECRET', 's3cret')
    expect(isAuthorizedCron(withAuth())).toBe(false)
  })
})
