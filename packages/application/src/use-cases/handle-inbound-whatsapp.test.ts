import { describe, expect, it, vi } from 'vitest'
import { ChannelIdentity, asEntityId } from '@lifedeck/domain'
import { InMemoryChannelIdentityRepository } from '@/testing/in-memory-channel-identity-repository'
import { FixedClock, ID } from '@/testing/fakes'
import {
  PAIR_GUIDANCE_MESSAGE,
  PAIR_LINKED_MESSAGE,
  makeHandleInboundWhatsApp,
} from '@/use-cases/handle-inbound-whatsapp'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const FROM = '5511999990000'

function setup() {
  const channelIdentities = new InMemoryChannelIdentityRepository()
  const sendText = vi.fn().mockResolvedValue(undefined)
  const handleInboundWhatsApp = makeHandleInboundWhatsApp({
    channelIdentities,
    messaging: { sendText },
    clock: new FixedClock(NOW),
  })
  return { channelIdentities, sendText, handleInboundWhatsApp }
}

function pending(
  code: string,
  pairingExpiresAt = new Date('2026-06-24T10:10:00.000Z'),
): ChannelIdentity {
  return ChannelIdentity.create({
    id: ID.verification,
    userId: asEntityId(ID.user),
    channel: 'whatsapp',
    pairingCode: code,
    pairingExpiresAt,
    now: NOW,
  })
}

describe('handleInboundWhatsApp', () => {
  it('echoes a message from a verified number', async () => {
    const { channelIdentities, sendText, handleInboundWhatsApp } = setup()
    const identity = pending('111111')
    identity.verify(FROM, NOW)
    await channelIdentities.save(identity)

    const result = await handleInboundWhatsApp({ from: FROM, text: 'hello' })

    expect(result).toEqual({ action: 'echo' })
    expect(sendText).toHaveBeenCalledWith(FROM, 'You said: hello')
  })

  it('links a number when the text matches a pending code', async () => {
    const { channelIdentities, sendText, handleInboundWhatsApp } = setup()
    await channelIdentities.save(pending('123456'))

    const result = await handleInboundWhatsApp({ from: FROM, text: ' 123456 ' })

    expect(result).toEqual({ action: 'linked' })
    expect(sendText).toHaveBeenCalledWith(FROM, PAIR_LINKED_MESSAGE)
    const linked = await channelIdentities.findByAddress(
      'whatsapp',
      '+5511999990000',
    )
    expect(linked?.isVerified()).toBe(true)
  })

  it('guides instead of linking when the code has expired', async () => {
    const { channelIdentities, sendText, handleInboundWhatsApp } = setup()
    await channelIdentities.save(
      pending('123456', new Date('2026-06-24T09:50:00.000Z')),
    )

    const result = await handleInboundWhatsApp({ from: FROM, text: '123456' })

    expect(result).toEqual({ action: 'guidance' })
    expect(sendText).toHaveBeenCalledWith(FROM, PAIR_GUIDANCE_MESSAGE)
  })

  it('guides an unlinked number with no matching code', async () => {
    const { sendText, handleInboundWhatsApp } = setup()

    const result = await handleInboundWhatsApp({ from: FROM, text: 'oi' })

    expect(result).toEqual({ action: 'guidance' })
    expect(sendText).toHaveBeenCalledWith(FROM, PAIR_GUIDANCE_MESSAGE)
  })

  it('guides when the message is empty', async () => {
    const { sendText, handleInboundWhatsApp } = setup()

    const result = await handleInboundWhatsApp({ from: FROM, text: '   ' })

    expect(result).toEqual({ action: 'guidance' })
    expect(sendText).toHaveBeenCalledWith(FROM, PAIR_GUIDANCE_MESSAGE)
  })
})
