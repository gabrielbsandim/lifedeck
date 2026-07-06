// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const set = vi.fn()
const del = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    constructor() {}
    set = set
    del = del
  },
}))

import {
  isRedisConfigured,
  markMessageProcessed,
  releaseMessageClaim,
} from '@/server/api/whatsapp-dedup'

describe('markMessageProcessed', () => {
  beforeEach(() => {
    set.mockReset()
    del.mockReset()
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('treats every message as new when Upstash is not configured', async () => {
    expect(await markMessageProcessed('wamid.1')).toBe(true)
    expect(set).not.toHaveBeenCalled()
  })

  it('marks a fresh message as new and a repeat as seen', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.test'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null)
    vi.resetModules()
    const mod = await import('@/server/api/whatsapp-dedup')

    expect(await mod.markMessageProcessed('wamid.2')).toBe(true)
    expect(await mod.markMessageProcessed('wamid.2')).toBe(false)
    expect(set).toHaveBeenCalledWith(
      'lifedeck/whatsapp/seen/wamid.2',
      '1',
      expect.objectContaining({ nx: true }),
    )
  })
})

describe('isRedisConfigured', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('is false unless both Upstash env vars are set', () => {
    expect(isRedisConfigured()).toBe(false)
    process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.test'
    expect(isRedisConfigured()).toBe(false)
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    expect(isRedisConfigured()).toBe(true)
  })
})

describe('releaseMessageClaim', () => {
  beforeEach(() => {
    del.mockReset()
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('is a no-op without Upstash', async () => {
    await releaseMessageClaim('wamid.9')
    expect(del).not.toHaveBeenCalled()
  })

  it('deletes the dedup key when Upstash is configured', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.test'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    vi.resetModules()
    const mod = await import('@/server/api/whatsapp-dedup')
    await mod.releaseMessageClaim('wamid.9')
    expect(del).toHaveBeenCalledWith('lifedeck/whatsapp/seen/wamid.9')
  })
})
