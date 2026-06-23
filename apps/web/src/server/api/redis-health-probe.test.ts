import { afterEach, describe, expect, it } from 'vitest'
import {
  RedisHealthProbe,
  createRedisHealthProbe,
} from '@/server/api/redis-health-probe'

describe('RedisHealthProbe', () => {
  it('reports healthy when the ping succeeds', async () => {
    const probe = new RedisHealthProbe({ ping: async () => 'PONG' })
    expect(probe.name).toBe('cache')
    await expect(probe.check()).resolves.toEqual({ healthy: true })
  })
})

describe('createRedisHealthProbe', () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.UPSTASH_REDIS_REST_URL
    } else {
      process.env.UPSTASH_REDIS_REST_URL = originalUrl
    }
    if (originalToken === undefined) {
      delete process.env.UPSTASH_REDIS_REST_TOKEN
    } else {
      process.env.UPSTASH_REDIS_REST_TOKEN = originalToken
    }
  })

  it('returns null when Upstash is not configured', () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    expect(createRedisHealthProbe()).toBeNull()
  })

  it('returns a probe when Upstash is configured', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    expect(createRedisHealthProbe()).toBeInstanceOf(RedisHealthProbe)
  })
})
