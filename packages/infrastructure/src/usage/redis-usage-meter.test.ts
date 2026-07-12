import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const REST_URL = 'https://redis.example.com'
const TOKEN = 'token'

type PipelineCommand = [string, ...unknown[]]

function stubFetch(payloads: unknown[]) {
  const fetchMock = vi.fn()
  for (const payload of payloads) {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => payload })
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function commandsOfCall(
  fetchMock: ReturnType<typeof vi.fn>,
  call: number,
): PipelineCommand[] {
  const [, init] = fetchMock.mock.calls[call] as [string, { body: string }]
  return JSON.parse(init.body) as PipelineCommand[]
}

async function loadMeter() {
  const mod = await import('@/usage/redis-usage-meter')
  return mod.createUsageMeter()
}

describe('createUsageMeter (redis)', () => {
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

  it('consumes credits atomically when both windows have room', async () => {
    const fetchMock = stubFetch([[{ result: [1, '', 12, 30] }]])
    const meter = await loadMeter()

    const result = await meter.consume('user-1', 12, {
      fiveHour: 100,
      weekly: 500,
    })

    expect(result).toEqual({
      ok: true,
      counts: { fiveHour: 12, weekly: 30 },
    })
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe(`${REST_URL}/pipeline`)
    const [command] = commandsOfCall(fetchMock, 0)
    expect(command?.[0]).toBe('EVAL')
    expect(command?.[3]).toBe('lifedeck/usage/5h/user-1')
    expect(command?.[4]).toBe('lifedeck/usage/week/user-1')
    expect(command?.[8]).toBe(12)
    expect(command?.[9]).toBe(100)
    expect(command?.[10]).toBe(500)
    expect(String(command?.[11])).toMatch(/^12:\d+:/)
    expect(command?.[12]).toBe(18000)
    expect(command?.[13]).toBe(604800)
  })

  it('blocks when the five-hour window would overflow', async () => {
    stubFetch([[{ result: [0, 'fiveHour', 95, 120] }]])
    const meter = await loadMeter()

    const result = await meter.consume('user-1', 10, {
      fiveHour: 100,
      weekly: 500,
    })

    expect(result).toEqual({ ok: false, window: 'fiveHour', used: 95 })
  })

  it('blocks when the weekly window would overflow', async () => {
    stubFetch([[{ result: [0, 'weekly', 40, 498] }]])
    const meter = await loadMeter()

    const result = await meter.consume('user-1', 5, {
      fiveHour: 100,
      weekly: 500,
    })

    expect(result).toEqual({ ok: false, window: 'weekly', used: 498 })
  })

  it('reads and trims both windows, summing credits per member', async () => {
    const fetchMock = stubFetch([
      [
        { result: 1 },
        { result: ['5:1:a', '3:2:b'] },
        { result: 2 },
        { result: ['10:3:c', '2:4:d'] },
      ],
    ])
    const meter = await loadMeter()

    const counts = await meter.current('user-1')

    expect(counts).toEqual({ fiveHour: 8, weekly: 12 })
    const commands = commandsOfCall(fetchMock, 0)
    expect(commands[0]?.[0]).toBe('ZREMRANGEBYSCORE')
    expect(commands[1]).toEqual(['ZRANGE', 'lifedeck/usage/5h/user-1', 0, -1])
    expect(commands[3]).toEqual(['ZRANGE', 'lifedeck/usage/week/user-1', 0, -1])
  })

  it('returns zeroes and ignores malformed members', async () => {
    stubFetch([
      [
        { result: 0 },
        { result: ['oops', '4:1:a'] },
        { result: 0 },
        { result: [] },
      ],
    ])
    const meter = await loadMeter()

    const counts = await meter.current('user-1')

    expect(counts).toEqual({ fiveHour: 4, weekly: 0 })
  })

  it('adds a credit entry to both windows and returns the refreshed counts', async () => {
    const fetchMock = stubFetch([
      [{ result: 1 }, { result: 'OK' }, { result: 1 }, { result: 'OK' }],
      [
        { result: 0 },
        { result: ['7:1:a'] },
        { result: 0 },
        { result: ['7:1:a'] },
      ],
    ])
    const meter = await loadMeter()

    const counts = await meter.add('user-1', 7)

    expect(counts).toEqual({ fiveHour: 7, weekly: 7 })
    const writes = commandsOfCall(fetchMock, 0)
    expect(writes[0]?.[0]).toBe('ZADD')
    expect(String(writes[0]?.[3])).toMatch(/^7:\d+:/)
    expect(writes[1]).toEqual(['EXPIRE', 'lifedeck/usage/5h/user-1', 18000])
    expect(writes[3]).toEqual(['EXPIRE', 'lifedeck/usage/week/user-1', 604800])
  })

  it('throws when the upstash pipeline responds with an error status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)
    const meter = await loadMeter()

    await expect(meter.current('user-1')).rejects.toThrow(
      'Upstash pipeline failed with status 500',
    )
  })

  it('falls back to a no-op meter when redis is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const meter = await loadMeter()

    expect(
      await meter.consume('user-1', 9, { fiveHour: 1, weekly: 1 }),
    ).toEqual({ ok: true, counts: { fiveHour: 0, weekly: 0 } })
    expect(await meter.current('user-1')).toEqual({ fiveHour: 0, weekly: 0 })
    expect(await meter.add('user-1', 9)).toEqual({ fiveHour: 0, weekly: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fails loud in production when redis is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    const previousEnv = process.env.NODE_ENV
    vi.stubEnv('NODE_ENV', 'production')
    const meter = await loadMeter()

    const notConfigured = /Usage meter is not configured/
    await expect(
      meter.consume('user-1', 1, { fiveHour: 1, weekly: 1 }),
    ).rejects.toThrow(notConfigured)
    await expect(meter.current('user-1')).rejects.toThrow(notConfigured)
    await expect(meter.add('user-1', 1)).rejects.toThrow(notConfigured)

    vi.stubEnv('NODE_ENV', previousEnv ?? 'test')
  })
})
