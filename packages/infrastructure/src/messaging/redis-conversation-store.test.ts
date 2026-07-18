import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const REST_URL = 'https://redis.example.com'
const TOKEN = 'token'

type PipelineCommand = [string, ...unknown[]]

function stubFetch(payload: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => payload,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function sentCommands(fetchMock: ReturnType<typeof vi.fn>): PipelineCommand[] {
  const [, init] = fetchMock.mock.calls[0] as [string, { body: string }]
  return JSON.parse(init.body) as PipelineCommand[]
}

async function loadStore() {
  const mod = await import('@/messaging/redis-conversation-store')
  return mod.createConversationStore()
}

describe('createConversationStore (redis)', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.UPSTASH_REDIS_REST_URL = REST_URL
    process.env.UPSTASH_REDIS_REST_TOKEN = TOKEN
  })

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    vi.unstubAllGlobals()
  })

  it('appends, trims to the window and refreshes the ttl atomically', async () => {
    const fetchMock = stubFetch([
      { result: 1 },
      { result: 'OK' },
      { result: 1 },
    ])
    const store = await loadStore()

    await store.append('user-1', [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ])

    const commands = sentCommands(fetchMock)
    expect(commands[0]).toEqual([
      'RPUSH',
      'lifedeck/conversation/user-1',
      '{"role":"user","content":"hi"}',
      '{"role":"assistant","content":"hello"}',
    ])
    expect(commands[1]).toEqual([
      'LTRIM',
      'lifedeck/conversation/user-1',
      -40,
      -1,
    ])
    expect(commands[2]).toEqual([
      'EXPIRE',
      'lifedeck/conversation/user-1',
      24 * 60 * 60,
    ])
  })

  it('skips an empty append without touching redis', async () => {
    const fetchMock = stubFetch([])
    const store = await loadStore()

    await store.append('user-1', [])

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loads stored turns and drops corrupt entries', async () => {
    const fetchMock = stubFetch([
      { result: ['{"role":"user","content":"hi"}', 'not-json'] },
    ])
    const store = await loadStore()

    const turns = await store.load('user-1')

    expect(turns).toEqual([{ role: 'user', content: 'hi' }])
    expect(sentCommands(fetchMock)[0]).toEqual([
      'LRANGE',
      'lifedeck/conversation/user-1',
      0,
      -1,
    ])
  })

  it('returns an empty history when redis has no list', async () => {
    stubFetch([{ result: null }])
    const store = await loadStore()

    expect(await store.load('user-1')).toEqual([])
  })

  it('clears the history with DEL', async () => {
    const fetchMock = stubFetch([{ result: 1 }])
    const store = await loadStore()

    await store.clear('user-1')

    expect(sentCommands(fetchMock)[0]).toEqual([
      'DEL',
      'lifedeck/conversation/user-1',
    ])
  })

  it('raises when the pipeline call fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    )
    const store = await loadStore()

    await expect(store.load('user-1')).rejects.toThrow(/status 500/)
  })

  it('falls back to in-memory storage without upstash config', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    const fetchMock = stubFetch([])
    const store = await loadStore()

    await store.append('user-1', [{ role: 'user', content: 'hi' }])
    expect(await store.load('user-1')).toEqual([
      { role: 'user', content: 'hi' },
    ])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
