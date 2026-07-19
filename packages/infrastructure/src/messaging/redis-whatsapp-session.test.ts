import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const REST_URL = 'https://redis.example.com'
const TOKEN = 'token'

function stubFetch(payloads: unknown[]) {
  const fetchMock = vi.fn()
  for (const payload of payloads) {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => payload })
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function loadWindow() {
  const mod = await import('@/messaging/redis-whatsapp-session')
  return mod.createWhatsappSessionWindow()
}

describe('createWhatsappSessionWindow (redis)', () => {
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

  it('marks the window with a 24h TTL under a normalized key', async () => {
    const fetchMock = stubFetch([[{ result: 'OK' }]])
    const window = await loadWindow()

    await window.markActive('5511999990000')

    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }]
    expect(url).toBe(`${REST_URL}/pipeline`)
    const [command] = JSON.parse(init.body) as unknown[][]
    expect(command).toEqual([
      'SET',
      'lifedeck/wa-window/+5511999990000',
      '1',
      'EX',
      String(24 * 60 * 60),
    ])
  })

  it('reports the window open when the key is present', async () => {
    stubFetch([[{ result: '1' }]])
    const window = await loadWindow()
    expect(await window.isOpen('+5511999990000')).toBe(true)
  })

  it('reports the window closed when the key has expired', async () => {
    stubFetch([[{ result: null }]])
    const window = await loadWindow()
    expect(await window.isOpen('5511999990000')).toBe(false)
  })

  it('falls back to a no-op window when redis is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const window = await loadWindow()

    await window.markActive('5511999990000')
    expect(await window.isOpen('5511999990000')).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
