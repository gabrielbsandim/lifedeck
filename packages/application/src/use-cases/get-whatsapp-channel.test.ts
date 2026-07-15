import { describe, expect, it } from 'vitest'
import { ChannelIdentity, asEntityId } from '@lifedeck/domain'
import { InMemoryChannelIdentityRepository } from '@/testing/in-memory-channel-identity-repository'
import { makeGetWhatsappChannel } from '@/use-cases/get-whatsapp-channel'

const USER = '22222222-2222-4222-8222-222222222222'
const IDENTITY_ID = '11111111-1111-4111-8111-111111111111'
const NOW = new Date('2026-06-24T10:00:00.000Z')

function setup() {
  const channelIdentities = new InMemoryChannelIdentityRepository()
  const getWhatsappChannel = makeGetWhatsappChannel({ channelIdentities })
  return { channelIdentities, getWhatsappChannel }
}

function pending(): ChannelIdentity {
  return ChannelIdentity.create({
    id: asEntityId(IDENTITY_ID),
    userId: asEntityId(USER),
    channel: 'whatsapp',
    pairingCode: '123456',
    pairingExpiresAt: new Date(NOW.getTime() + 600_000),
    now: NOW,
  })
}

describe('getWhatsappChannel', () => {
  it('reports none when the account has no WhatsApp identity', async () => {
    const ctx = setup()
    expect(await ctx.getWhatsappChannel(USER)).toEqual({ status: 'none' })
  })

  it('reports pending while a code is awaiting confirmation', async () => {
    const ctx = setup()
    await ctx.channelIdentities.save(pending())
    expect(await ctx.getWhatsappChannel(USER)).toEqual({ status: 'pending' })
  })

  it('reports linked with the verified address once paired', async () => {
    const ctx = setup()
    const identity = pending()
    identity.verify('+5511999990000', NOW)
    await ctx.channelIdentities.save(identity)

    expect(await ctx.getWhatsappChannel(USER)).toEqual({
      status: 'linked',
      address: '+5511999990000',
    })
  })
})
