import { afterEach, describe, expect, it, vi } from 'vitest'
import { AbracodeChannel } from '@/messaging/abracode-channel'

const BASE = 'https://api.abracode.test'

function stubFetch(response: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function accepted() {
  return { ok: true, status: 202, text: async () => '' }
}

function channel() {
  return new AbracodeChannel({
    apiKey: 'wpk_test_x',
    from: 'pn_1',
    baseUrl: BASE,
    phoneNumberId: 'meta_1',
  })
}

describe('AbracodeChannel', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends a text message to /api/v1/messages with the api key and flat body', async () => {
    const fetchMock = stubFetch(accepted())

    await channel().sendText('+5511999998888', 'hi')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/api/v1/messages`)
    expect((init.headers as Record<string, string>).authorization).toBe(
      'Bearer wpk_test_x',
    )
    expect(JSON.parse(init.body as string)).toEqual({
      type: 'text',
      from: 'pn_1',
      to: '+5511999998888',
      body: 'hi',
    })
  })

  it('maps a template to Abracode body components', async () => {
    const fetchMock = stubFetch(accepted())

    await channel().sendTemplate('+551199', {
      name: 'reminder',
      language: 'pt_BR',
      params: ['Dentist', '2026-07-13T10:00:00Z'],
    })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({
      type: 'template',
      from: 'pn_1',
      to: '+551199',
      templateName: 'reminder',
      languageCode: 'pt_BR',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Dentist' },
            { type: 'text', text: '2026-07-13T10:00:00Z' },
          ],
        },
      ],
    })
  })

  it('maps quick-reply buttons to an interactive body', async () => {
    const fetchMock = stubFetch(accepted())

    await channel().sendButtons('+551199', 'Reschedule it?', [
      { id: 'nudge_yes:1', title: 'Yes, reschedule' },
      { id: 'nudge_no:1', title: 'Not today' },
    ])

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({
      type: 'interactive',
      from: 'pn_1',
      to: '+551199',
      interactive: {
        type: 'button',
        body: { text: 'Reschedule it?' },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: { id: 'nudge_yes:1', title: 'Yes, reschedule' },
            },
            { type: 'reply', reply: { id: 'nudge_no:1', title: 'Not today' } },
          ],
        },
      },
    })
  })

  it('throws with status and detail when a send fails', async () => {
    stubFetch({
      ok: false,
      status: 422,
      text: async () => 'number_not_registered',
    })

    await expect(channel().sendText('+551199', 'hi')).rejects.toThrow(
      /Abracode send failed \(422\): number_not_registered/,
    )
  })

  it('fetches media with the phone number id and reads the content type', async () => {
    const bytes = new ArrayBuffer(3)
    const fetchMock = stubFetch({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'image/jpeg' }),
      arrayBuffer: async () => bytes,
    })

    const result = await channel().fetchMedia('media_1')

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe(`${BASE}/api/v1/media/media_1?phoneNumberId=meta_1`)
    expect(result).toEqual({ data: bytes, mimeType: 'image/jpeg' })
  })

  it('requires the meta phone number id to fetch media', async () => {
    const noMedia = new AbracodeChannel({
      apiKey: 'k',
      from: 'pn_1',
      baseUrl: BASE,
    })

    await expect(noMedia.fetchMedia('m')).rejects.toThrow(
      /ABRACODE_PHONE_NUMBER_ID/,
    )
  })
})
