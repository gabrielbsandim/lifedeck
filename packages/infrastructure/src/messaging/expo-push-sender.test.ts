import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { ExpoPushSender, createPushSender } from '@/messaging/expo-push-sender'

function respond(tickets: unknown[]): Response {
  return new Response(JSON.stringify({ data: tickets }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function message(token: string) {
  return { token, title: 'Reminder', body: 'Standup at 09:00' }
}

// The mock's call list is optional under strict indexing, so read it once here
// and fail loudly rather than sprinkling optional chaining through every
// assertion.
function call(fetchMock: Mock, index = 0) {
  const args = fetchMock.mock.calls[index]
  if (!args) {
    throw new Error(`fetch was not called ${index + 1} time(s)`)
  }
  const [url, init] = args as [string, RequestInit]
  return {
    url,
    headers: init.headers as Record<string, string>,
    body: JSON.parse(init.body as string) as unknown[],
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('ExpoPushSender', () => {
  it('posts every message and counts the accepted ones', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(respond([{ status: 'ok' }, { status: 'ok' }]))
    vi.stubGlobal('fetch', fetchMock)

    const result = await new ExpoPushSender().send([
      { ...message('t1'), data: { type: 'event-reminder' } },
      message('t2'),
    ])

    expect(result).toEqual({ delivered: 2, invalidTokens: [] })
    expect(call(fetchMock).url).toBe('https://exp.host/--/api/v2/push/send')
    expect(call(fetchMock).body).toEqual([
      {
        to: 't1',
        title: 'Reminder',
        body: 'Standup at 09:00',
        data: { type: 'event-reminder' },
        sound: 'default',
        channelId: 'default',
      },
      {
        to: 't2',
        title: 'Reminder',
        body: 'Standup at 09:00',
        sound: 'default',
        channelId: 'default',
      },
    ])
  })

  it('reports only a token that is gone for good', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respond([
          { status: 'error', details: { error: 'DeviceNotRegistered' } },
          // Account-level and transient failures must not delete a device.
          { status: 'error', details: { error: 'InvalidCredentials' } },
          { status: 'error', message: 'rate limited' },
        ]),
      ),
    )

    const result = await new ExpoPushSender().send([
      message('dead'),
      message('bad-credentials'),
      message('throttled'),
    ])

    expect(result).toEqual({ delivered: 0, invalidTokens: ['dead'] })
  })

  it('does not count a message the provider left unanswered', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond([])))
    const result = await new ExpoPushSender().send([message('t1')])
    expect(result).toEqual({ delivered: 0, invalidTokens: [] })
  })

  it('splits a fan-out wider than one request', async () => {
    // A fresh Response per call: a body can only be read once.
    const fetchMock = vi
      .fn()
      .mockImplementation(async () =>
        respond(Array.from({ length: 100 }, () => ({ status: 'ok' }))),
      )
    vi.stubGlobal('fetch', fetchMock)

    const messages = Array.from({ length: 101 }, (_, index) =>
      message(`t${index}`),
    )
    await new ExpoPushSender().send(messages)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(call(fetchMock, 0).body).toHaveLength(100)
    expect(call(fetchMock, 1).body).toHaveLength(1)
  })

  it('sends the access token when the account requires one', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond([{ status: 'ok' }]))
    vi.stubGlobal('fetch', fetchMock)

    await new ExpoPushSender({ accessToken: 'secret' }).send([message('t1')])

    expect(call(fetchMock).headers).toMatchObject({
      authorization: 'Bearer secret',
    })
  })

  it('honours a custom base url without a trailing slash', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond([{ status: 'ok' }]))
    vi.stubGlobal('fetch', fetchMock)

    await new ExpoPushSender({ baseUrl: 'https://push.test/' }).send([
      message('t1'),
    ])

    expect(call(fetchMock).url).toBe('https://push.test/--/api/v2/push/send')
  })

  it('throws when the provider rejects the request outright', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nope', { status: 500 })),
    )
    await expect(new ExpoPushSender().send([message('t1')])).rejects.toThrow(
      'Expo push failed (500): nope',
    )
  })

  it('tolerates a response with no ticket list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    const result = await new ExpoPushSender().send([message('t1')])
    expect(result).toEqual({ delivered: 0, invalidTokens: [] })
  })

  it('builds an unauthenticated sender when no token is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond([{ status: 'ok' }]))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('EXPO_ACCESS_TOKEN', '  ')

    await createPushSender().send([message('t1')])

    expect(call(fetchMock).headers).not.toHaveProperty('authorization')
  })

  it('picks up the access token from the environment', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond([{ status: 'ok' }]))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('EXPO_ACCESS_TOKEN', 'from-env')

    await createPushSender().send([message('t1')])

    expect(call(fetchMock).headers).toMatchObject({
      authorization: 'Bearer from-env',
    })
  })
})
