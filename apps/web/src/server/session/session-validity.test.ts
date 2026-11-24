// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearSessionValidityCache,
  forgetSessionValidity,
  isSessionCurrent,
} from '@/server/session/session-validity'

const sessionsValidFrom = vi.fn<(userId: string) => Promise<Date | null>>()

vi.mock('@/server/container', () => ({
  getContainer: () => ({ sessionsValidFrom }),
}))

const REVOKED_AT = new Date('2026-06-21T10:00:00.000Z')
const REVOKED_AT_SECONDS = REVOKED_AT.getTime() / 1000

describe('isSessionCurrent', () => {
  beforeEach(() => {
    clearSessionValidityCache()
    sessionsValidFrom.mockReset()
    sessionsValidFrom.mockResolvedValue(REVOKED_AT)
  })

  it('splits tokens at the revocation second', async () => {
    expect(await isSessionCurrent('u1', REVOKED_AT_SECONDS - 1)).toBe(false)
    expect(await isSessionCurrent('u1', REVOKED_AT_SECONDS)).toBe(true)
  })

  it('accepts every token of a user who never revoked', async () => {
    sessionsValidFrom.mockResolvedValue(null)
    expect(await isSessionCurrent('u1', 0)).toBe(true)
  })

  it('reads the store again once the entry is forgotten', async () => {
    await isSessionCurrent('u1', REVOKED_AT_SECONDS)
    forgetSessionValidity('u1')
    await isSessionCurrent('u1', REVOKED_AT_SECONDS)
    expect(sessionsValidFrom).toHaveBeenCalledTimes(2)
  })

  it('stays bounded by dropping the cache when it fills up', async () => {
    for (let index = 0; index <= 5_000; index += 1) {
      await isSessionCurrent(`u${index}`, REVOKED_AT_SECONDS)
    }
    await isSessionCurrent('u0', REVOKED_AT_SECONDS)
    expect(sessionsValidFrom).toHaveBeenCalledTimes(5_002)
  })
})
