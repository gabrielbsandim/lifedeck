import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from '@/lib/api/client'

function mockFetch(response: { ok: boolean; status?: number; body: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 400),
    json: async () => response.body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('unwraps the data envelope on success', async () => {
    const fetchMock = mockFetch({ ok: true, body: { data: { id: 1 } } })

    const result = await apiRequest<{ id: number }>('/api/v1/thing')

    expect(result).toEqual({ id: 1 })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/thing',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'content-type': 'application/json',
        }),
      }),
    )
  })

  it('throws an ApiError carrying status and code on failure', async () => {
    mockFetch({
      ok: false,
      status: 404,
      body: { error: { code: 'NOT_FOUND', message: 'Missing.' } },
    })

    await expect(apiRequest('/api/v1/thing')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Missing.',
    })
  })

  it('falls back to a generic ApiError when the body is unparseable', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json')
      },
    })
    vi.stubGlobal('fetch', fetchMock)

    const error = (await apiRequest('/api/v1/thing').catch(e => e)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(500)
    expect(error.code).toBe('UNKNOWN')
  })

  it('forwards the browser language as accept-language', async () => {
    vi.stubGlobal('navigator', { language: 'pt-BR' })
    const fetchMock = mockFetch({ ok: true, body: { data: null } })

    await apiRequest('/api/v1/thing')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/thing',
      expect.objectContaining({
        headers: expect.objectContaining({ 'accept-language': 'pt-BR' }),
      }),
    )
  })

  it('omits accept-language when no browser language is available', async () => {
    vi.stubGlobal('navigator', undefined)
    const fetchMock = mockFetch({ ok: true, body: { data: null } })

    await apiRequest('/api/v1/thing')

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<
      string,
      string
    >
    expect(headers['accept-language']).toBeUndefined()
  })

  it('lets FormData own its content-type instead of forcing json', async () => {
    const fetchMock = mockFetch({ ok: true, body: { data: null } })
    const form = new FormData()
    form.append('text', 'hi')

    await apiRequest('/api/v1/thing', { method: 'POST', body: form })

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<
      string,
      string
    >
    expect(headers['content-type']).toBeUndefined()
  })

  it('passes through method and body', async () => {
    const fetchMock = mockFetch({ ok: true, body: { data: null } })

    await apiRequest('/api/v1/thing', {
      method: 'POST',
      body: JSON.stringify({ a: 1 }),
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/thing',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ a: 1 }),
      }),
    )
  })
})
