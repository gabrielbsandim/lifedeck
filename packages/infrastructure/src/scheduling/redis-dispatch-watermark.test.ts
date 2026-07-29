import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  NoopDispatchWatermark,
  RedisDispatchWatermark,
  createDispatchWatermark,
} from '@/scheduling/redis-dispatch-watermark'

const REST_URL = 'https://redis.example.com'
const TOKEN = 'token'
const NOW = new Date('2026-06-24T10:00:00.000Z')
const KEY = 'lifedeck:dispatch:next-run-at'

function stubFetch(...payloads: unknown[]) {
  const fetchMock = vi.fn()
  for (const payload of payloads) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => payload,
    })
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function commandOfCall(fetchMock: ReturnType<typeof vi.fn>, call: number) {
  const [, init] = fetchMock.mock.calls[call] as [string, { body: string }]
  return JSON.parse(init.body) as string[]
}

function makeWatermark(onError = vi.fn()) {
  return {
    watermark: new RedisDispatchWatermark(REST_URL, TOKEN, onError),
    onError,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('RedisDispatchWatermark', () => {
  it('skips the sweep while the next run is still in the future', async () => {
    stubFetch({ result: String(NOW.getTime() + 60_000) })
    const { watermark } = makeWatermark()

    expect(await watermark.hasWorkBefore(NOW)).toBe(false)
  })

  it('asks for a sweep once the next run time has arrived', async () => {
    stubFetch({ result: String(NOW.getTime()) })
    const { watermark } = makeWatermark()

    expect(await watermark.hasWorkBefore(NOW)).toBe(true)
  })

  it('fails open when the key is missing', async () => {
    stubFetch({ result: null })
    const { watermark } = makeWatermark()

    expect(await watermark.hasWorkBefore(NOW)).toBe(true)
  })

  it('fails open when the stored value is not a number', async () => {
    stubFetch({ result: 'not-a-timestamp' })
    const { watermark } = makeWatermark()

    expect(await watermark.hasWorkBefore(NOW)).toBe(true)
  })

  it('fails open and reports when Redis errors', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('redis down'))
    vi.stubGlobal('fetch', fetchMock)
    const { watermark, onError } = makeWatermark()

    expect(await watermark.hasWorkBefore(NOW)).toBe(true)
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('fails open when Redis answers with an error payload', async () => {
    stubFetch({ error: 'WRONGTYPE' })
    const { watermark, onError } = makeWatermark()

    expect(await watermark.hasWorkBefore(NOW)).toBe(true)
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('fails open on a non-2xx response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    const { watermark, onError } = makeWatermark()

    expect(await watermark.hasWorkBefore(NOW)).toBe(true)
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('lowers an existing watermark without touching its heal deadline', async () => {
    const fetchMock = stubFetch({ result: 1 })
    const { watermark } = makeWatermark()

    await watermark.noteNextRun(NOW)

    const command = commandOfCall(fetchMock, 0)
    expect(command[0]).toBe('EVAL')
    expect(command).toContain(KEY)
    expect(command).toContain(String(NOW.getTime()))
    expect(command[1]).toContain('KEEPTTL')
  })

  it('drops the key when lowering fails, so the next sweep runs', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('redis down'))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    const { watermark, onError } = makeWatermark()

    await watermark.noteNextRun(NOW)

    expect(commandOfCall(fetchMock, 1)).toEqual(['DEL', KEY])
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('reports when even dropping the key fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('redis down'))
    vi.stubGlobal('fetch', fetchMock)
    const { watermark, onError } = makeWatermark()

    await watermark.noteNextRun(NOW)

    expect(onError).toHaveBeenCalledTimes(2)
  })

  it('records the next pending run with a heal TTL after a sweep', async () => {
    const fetchMock = stubFetch({ result: 'OK' })
    const { watermark } = makeWatermark()
    const next = new Date('2026-06-24T18:00:00.000Z')

    await watermark.markDrained(next)

    expect(commandOfCall(fetchMock, 0)).toEqual([
      'SET',
      KEY,
      String(next.getTime()),
      'EX',
      String(6 * 60 * 60),
    ])
  })

  it('parks the watermark far out when nothing is pending', async () => {
    const fetchMock = stubFetch({ result: 'OK' })
    const { watermark } = makeWatermark()

    await watermark.markDrained(null)

    const command = commandOfCall(fetchMock, 0)
    expect(Number(command[2])).toBeGreaterThan(NOW.getTime())
  })

  it('drops the key when recording the drained state fails', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('redis down'))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    const { watermark } = makeWatermark()

    await watermark.markDrained(null)

    expect(commandOfCall(fetchMock, 1)).toEqual(['DEL', KEY])
  })
})

describe('NoopDispatchWatermark', () => {
  it('always asks for a sweep', async () => {
    const watermark = new NoopDispatchWatermark()

    await watermark.noteNextRun(NOW)
    await watermark.markDrained(null)

    expect(await watermark.hasWorkBefore(NOW)).toBe(true)
  })
})

describe('createDispatchWatermark', () => {
  it('falls back to the no-op when Redis is not configured', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')

    expect(createDispatchWatermark()).toBeInstanceOf(NoopDispatchWatermark)
  })

  it('builds the Redis watermark when configured', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', `${REST_URL}/`)
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', TOKEN)

    expect(createDispatchWatermark()).toBeInstanceOf(RedisDispatchWatermark)
  })
})
