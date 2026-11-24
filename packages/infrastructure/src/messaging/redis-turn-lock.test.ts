import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryTurnLock } from '@lifedeck/application'

const REST_URL = 'https://redis.example.com'
const TOKEN = 'token'
const USER = 'user-1'

function reply(result: unknown) {
  return { ok: true, json: async () => [{ result }] }
}

function sentCommands(fetchMock: ReturnType<typeof vi.fn>): unknown[][] {
  return fetchMock.mock.calls.map(
    ([, init]) =>
      (JSON.parse((init as { body: string }).body) as unknown[][])[0]!,
  )
}

async function loadLock(timing?: { waitMs?: number; pollMs?: number }) {
  const mod = await import('@/messaging/redis-turn-lock')
  return mod.createTurnLock(timing)
}

describe('createTurnLock (redis)', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.UPSTASH_REDIS_REST_URL = `${REST_URL}/`
    process.env.UPSTASH_REDIS_REST_TOKEN = TOKEN
  })

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    vi.unstubAllGlobals()
  })

  it('takes the lock with SET NX and a TTL, and releases only its own token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply('OK'))
      .mockResolvedValueOnce(reply(1))
    vi.stubGlobal('fetch', fetchMock)
    const lock = await loadLock()

    const release = await lock.acquire(USER)
    await release?.()

    const [set, del] = sentCommands(fetchMock)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${REST_URL}/pipeline`)
    expect(set?.slice(0, 2)).toEqual(['SET', `lifedeck/turn-lock/${USER}`])
    expect(set?.slice(3)).toEqual(['NX', 'PX', 60_000])
    expect(del?.[0]).toBe('EVAL')
    expect(del?.slice(2)).toEqual([1, `lifedeck/turn-lock/${USER}`, set?.[2]])
  })

  it('waits for the holder and takes the lock once it frees', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply(null))
      .mockResolvedValueOnce(reply('OK'))
    vi.stubGlobal('fetch', fetchMock)
    const lock = await loadLock({ waitMs: 1_000, pollMs: 1 })

    expect(await lock.acquire(USER)).toBeTypeOf('function')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('gives up after the wait when the holder never frees it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(null)))
    const lock = await loadLock({ waitMs: 5, pollMs: 1 })

    expect(await lock.acquire(USER)).toBeNull()
  })

  it('fails open when Redis is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    )
    const lock = await loadLock()

    const release = await lock.acquire(USER)
    expect(release).toBeTypeOf('function')
    await expect(release?.()).resolves.toBeUndefined()
  })

  it('swallows a failed release, since the TTL frees the lock', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(reply('OK'))
        .mockRejectedValueOnce(new Error('network')),
    )
    const lock = await loadLock()

    const release = await lock.acquire(USER)
    await expect(release?.()).resolves.toBeUndefined()
  })

  it('queues turns in process when Redis is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    const lock = await loadLock()
    expect(lock.constructor.name).toBe(InMemoryTurnLock.name)
  })
})
