import { afterEach, describe, expect, it, vi } from 'vitest'
import { httpFetch } from '@/http/http-fetch'

describe('httpFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('forwards the request and attaches an abort signal with the default timeout', async () => {
    const response = { ok: true } as Response
    const fetchMock = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', fetchMock)

    const result = await httpFetch('https://api.test/thing', {
      method: 'POST',
    })

    expect(result).toBe(response)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.test/thing')
    expect(init.method).toBe('POST')
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('aborts when the upstream does not respond within the timeout', async () => {
    const fetchMock = vi.fn(
      (_input: string | URL, init: RequestInit = {}) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new Error('aborted'))
          })
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(httpFetch('https://api.test/slow', {}, 5)).rejects.toThrow(
      'aborted',
    )
  })
})
