import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api-error'
import { createApiClient } from '@/create-client'

type FetchArgs = { url: string; init: RequestInit }

function stubFetch(response: Response) {
  const calls: FetchArgs[] = []
  const fetchMock = vi.fn((url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    return Promise.resolve(response)
  }) as unknown as typeof fetch
  return { fetchMock, calls }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('createApiClient', () => {
  it('unwraps the data envelope', async () => {
    const { fetchMock } = stubFetch(jsonResponse({ data: { id: 1 } }))
    const client = createApiClient({ fetch: fetchMock })
    await expect(client.request('/tasks/1')).resolves.toEqual({ id: 1 })
  })

  it('prepends the base URL and sets default headers', async () => {
    const { fetchMock, calls } = stubFetch(jsonResponse({ data: null }))
    const client = createApiClient({
      fetch: fetchMock,
      baseUrl: 'https://api.test/api/v1',
    })
    await client.request('/sessions/me')
    expect(calls[0]?.url).toBe('https://api.test/api/v1/sessions/me')
    expect(calls[0]?.init.headers).toMatchObject({
      'content-type': 'application/json',
    })
  })

  it('adds credentials, locale, and bearer token when configured', async () => {
    const { fetchMock, calls } = stubFetch(jsonResponse({ data: null }))
    const client = createApiClient({
      fetch: fetchMock,
      credentials: 'include',
      getLocale: () => 'pt-BR',
      getToken: () => 'jwt-123',
    })
    await client.request('/x')
    expect(calls[0]?.init.credentials).toBe('include')
    expect(calls[0]?.init.headers).toMatchObject({
      'accept-language': 'pt-BR',
      authorization: 'Bearer jwt-123',
    })
  })

  it('omits optional headers and awaits an async token getter', async () => {
    const { fetchMock, calls } = stubFetch(jsonResponse({ data: null }))
    const client = createApiClient({
      fetch: fetchMock,
      getLocale: () => undefined,
      getToken: () => Promise.resolve(null),
    })
    await client.request('/x')
    const headers = calls[0]?.init.headers as Record<string, string>
    expect(headers.authorization).toBeUndefined()
    expect(headers['accept-language']).toBeUndefined()
    expect(calls[0]?.init.credentials).toBeUndefined()
  })

  it('lets caller headers override defaults', async () => {
    const { fetchMock, calls } = stubFetch(jsonResponse({ data: null }))
    const client = createApiClient({ fetch: fetchMock })
    await client.request('/x', { headers: { 'content-type': 'text/plain' } })
    expect(calls[0]?.init.headers).toMatchObject({
      'content-type': 'text/plain',
    })
  })

  it('returns a normalized page', async () => {
    const { fetchMock } = stubFetch(
      jsonResponse({ data: [{ id: 1 }], nextCursor: 'abc' }),
    )
    const client = createApiClient({ fetch: fetchMock })
    await expect(client.requestPage('/tasks')).resolves.toEqual({
      items: [{ id: 1 }],
      nextCursor: 'abc',
    })
  })

  it('throws an ApiError with the server code and message', async () => {
    const { fetchMock } = stubFetch(
      jsonResponse({ error: { code: 'FORBIDDEN', message: 'Nope' } }, 403),
    )
    const client = createApiClient({ fetch: fetchMock })
    await expect(client.request('/x')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      message: 'Nope',
    })
  })

  it('falls back to defaults when the error body is missing', async () => {
    const { fetchMock } = stubFetch(new Response('', { status: 500 }))
    const client = createApiClient({ fetch: fetchMock })
    const error = await client.request('/x').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 500, code: 'UNKNOWN' })
  })
})
