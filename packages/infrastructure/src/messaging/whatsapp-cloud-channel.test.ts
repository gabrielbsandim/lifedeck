import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  WhatsAppCloudChannel,
  createMessagingChannel,
} from '@/messaging/whatsapp-cloud-channel'

const GRAPH = 'https://graph.facebook.com/v21.0'
const PHONE_ID = 'pn_1'
const TOKEN = 'tok_1'

function stubFetch(...responses: unknown[]) {
  const fetchMock = vi.fn()
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response)
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function accepted() {
  return { ok: true, status: 200, text: async () => '' }
}

function channel() {
  return new WhatsAppCloudChannel(PHONE_ID, TOKEN)
}

describe('WhatsAppCloudChannel', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.WHATSAPP_PHONE_NUMBER_ID
    delete process.env.WHATSAPP_ACCESS_TOKEN
    delete process.env.ABRACODE_API_KEY
    delete process.env.ABRACODE_FROM
  })

  it('posts a text message to the graph messages endpoint', async () => {
    const fetchMock = stubFetch(accepted())

    await channel().sendText('+551199', 'hi')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${GRAPH}/${PHONE_ID}/messages`)
    expect((init.headers as Record<string, string>).authorization).toBe(
      `Bearer ${TOKEN}`,
    )
    expect(JSON.parse(init.body as string)).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '+551199',
      type: 'text',
      text: { body: 'hi' },
    })
  })

  it('maps a template to graph body parameters', async () => {
    const fetchMock = stubFetch(accepted())

    await channel().sendTemplate('+551199', {
      name: 'reminder',
      language: 'pt_BR',
      params: ['Dentist'],
    })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '+551199',
      type: 'template',
      template: {
        name: 'reminder',
        language: { code: 'pt_BR' },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: 'Dentist' }],
          },
        ],
      },
    })
  })

  it('maps quick-reply buttons to an interactive message', async () => {
    const fetchMock = stubFetch(accepted())

    await channel().sendButtons('+551199', 'Reschedule it?', [
      { id: 'nudge_yes:1', title: 'Yes, reschedule' },
      { id: 'nudge_no:1', title: 'Not today' },
    ])

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '+551199',
      type: 'interactive',
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

  it('throws with status and detail when a button send fails', async () => {
    stubFetch({ ok: false, status: 400, text: async () => 'bad_request' })

    await expect(
      channel().sendButtons('+551199', 'x', [{ id: 'a', title: 'A' }]),
    ).rejects.toThrow(/WhatsApp buttons failed \(400\): bad_request/)
  })

  it('fetches media in two steps and reads the mime type', async () => {
    const bytes = new ArrayBuffer(4)
    const fetchMock = stubFetch(
      {
        ok: true,
        status: 200,
        json: async () => ({ url: `${GRAPH}/blob`, mime_type: 'audio/ogg' }),
      },
      { ok: true, status: 200, arrayBuffer: async () => bytes },
    )

    const result = await channel().fetchMedia('media_1')

    expect((fetchMock.mock.calls[0] as [string])[0]).toBe(`${GRAPH}/media_1`)
    expect((fetchMock.mock.calls[1] as [string])[0]).toBe(`${GRAPH}/blob`)
    expect(result).toEqual({ data: bytes, mimeType: 'audio/ogg' })
  })

  it('throws when a media lookup has no url', async () => {
    stubFetch({ ok: true, status: 200, json: async () => ({}) })

    await expect(channel().fetchMedia('m')).rejects.toThrow(
      /WhatsApp media response had no URL/,
    )
  })

  it('drops sends and refuses media when no credentials are configured', async () => {
    const noop = createMessagingChannel()

    // Noop channel: sends resolve to nothing, media fetch fails loudly.
    await expect(noop.sendText('+551199', 'hi')).resolves.toBeUndefined()
    await expect(
      noop.sendButtons('+551199', 'x', [{ id: 'a', title: 'A' }]),
    ).resolves.toBeUndefined()
    await expect(noop.fetchMedia('m')).rejects.toThrow(
      /media fetch is not configured/,
    )
  })

  it('builds a direct Meta channel when credentials are set', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = PHONE_ID
    process.env.WHATSAPP_ACCESS_TOKEN = TOKEN
    const fetchMock = stubFetch(accepted())

    await createMessagingChannel().sendText('+551199', 'hi')

    expect((fetchMock.mock.calls[0] as [string])[0]).toBe(
      `${GRAPH}/${PHONE_ID}/messages`,
    )
  })
})
