import { describe, expect, it, vi } from 'vitest'
import { ChannelIdentity, asEntityId } from '@lifedeck/domain'
import { makeSendProactiveMessage } from '@/shared/send-proactive-message'
import { InMemoryChannelIdentityRepository } from '@/testing/in-memory-channel-identity-repository'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const IDENTITY_ID = '22222222-2222-4222-8222-222222222222'
const ADDRESS = '+5511999990000'
const TEMPLATE = { name: 'event_reminder', language: 'pt_BR', params: ['x'] }

async function setup(options: {
  verified?: boolean
  windowOpen?: boolean
  hasIdentity?: boolean
}) {
  const channelIdentities = new InMemoryChannelIdentityRepository()
  if (options.hasIdentity !== false) {
    const identity = ChannelIdentity.create({
      id: asEntityId(IDENTITY_ID),
      userId: asEntityId(USER_ID),
      channel: 'whatsapp',
      targetAddress: ADDRESS,
      pairingCode: '123456',
      pairingExpiresAt: new Date('2026-06-24T00:10:00.000Z'),
      now: new Date('2026-06-24T00:00:00.000Z'),
    })
    if (options.verified !== false) {
      identity.verify(ADDRESS, new Date('2026-06-24T00:05:00.000Z'))
    }
    await channelIdentities.save(identity)
  }
  const sendText = vi.fn().mockResolvedValue(undefined)
  const sendTemplate = vi.fn().mockResolvedValue(undefined)
  const sendButtons = vi.fn().mockResolvedValue(undefined)
  const send = makeSendProactiveMessage({
    channelIdentities,
    messaging: { sendText, sendTemplate, sendButtons, fetchMedia: vi.fn() },
    whatsappSession:
      options.windowOpen === undefined
        ? undefined
        : {
            markActive: vi.fn(),
            isOpen: async () => options.windowOpen ?? false,
          },
  })
  return { send, sendText, sendTemplate, sendButtons }
}

describe('sendProactiveMessage', () => {
  it('sends free-form text while the session window is open', async () => {
    const { send, sendText, sendTemplate } = await setup({ windowOpen: true })

    const result = await send(USER_ID, { text: 'Bom dia!', template: TEMPLATE })

    expect(result).toEqual({ delivered: true })
    expect(sendText).toHaveBeenCalledWith(ADDRESS, 'Bom dia!')
    expect(sendTemplate).not.toHaveBeenCalled()
  })

  it('sends quick-reply buttons while the window is open', async () => {
    const { send, sendText, sendButtons } = await setup({ windowOpen: true })
    const buttons = [
      { id: 'nudge_yes:1', title: 'Yes' },
      { id: 'nudge_no:1', title: 'No' },
    ]

    const result = await send(USER_ID, { text: 'Reschedule?', buttons })

    expect(result).toEqual({ delivered: true })
    expect(sendButtons).toHaveBeenCalledWith(ADDRESS, 'Reschedule?', buttons)
    expect(sendText).not.toHaveBeenCalled()
  })

  it('falls back to the template once the window has closed', async () => {
    const { send, sendText, sendTemplate, sendButtons } = await setup({
      windowOpen: false,
    })

    const result = await send(USER_ID, {
      text: 'Bom dia!',
      template: TEMPLATE,
      buttons: [{ id: 'nudge_yes:1', title: 'Yes' }],
    })

    expect(result).toEqual({ delivered: true })
    expect(sendTemplate).toHaveBeenCalledWith(ADDRESS, TEMPLATE)
    expect(sendText).not.toHaveBeenCalled()
    // Interactive messages are window-only; the closed-window path drops them.
    expect(sendButtons).not.toHaveBeenCalled()
  })

  it('does nothing when the window is closed and no template is given', async () => {
    const { send, sendText, sendTemplate } = await setup({ windowOpen: false })

    const result = await send(USER_ID, { text: 'Bom dia!' })

    expect(result).toEqual({ delivered: false })
    expect(sendText).not.toHaveBeenCalled()
    expect(sendTemplate).not.toHaveBeenCalled()
  })

  it('skips a user with no verified WhatsApp number', async () => {
    const { send, sendText } = await setup({
      verified: false,
      windowOpen: true,
    })

    const result = await send(USER_ID, { text: 'Hi' })

    expect(result).toEqual({ delivered: false })
    expect(sendText).not.toHaveBeenCalled()
  })

  it('skips a user with no linked number at all', async () => {
    const { send } = await setup({ hasIdentity: false, windowOpen: true })
    expect(await send(USER_ID, { text: 'Hi' })).toEqual({ delivered: false })
  })

  it('swallows a send failure and reports not delivered', async () => {
    const { send, sendText } = await setup({ windowOpen: true })
    sendText.mockRejectedValueOnce(new Error('meta down'))

    const result = await send(USER_ID, { text: 'Hi' })

    expect(result).toEqual({ delivered: false })
  })

  it('treats a missing session window as closed', async () => {
    const { send, sendTemplate } = await setup({})

    await send(USER_ID, { text: 'Hi', template: TEMPLATE })

    expect(sendTemplate).toHaveBeenCalledWith(ADDRESS, TEMPLATE)
  })
})
