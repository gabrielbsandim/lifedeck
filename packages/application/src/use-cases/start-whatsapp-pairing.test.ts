import { describe, expect, it } from 'vitest'
import { ChannelIdentity, ValidationError, asEntityId } from '@lifedeck/domain'
import { InMemoryChannelIdentityRepository } from '@/testing/in-memory-channel-identity-repository'
import { FixedClock, ID } from '@/testing/fakes'
import { makeStartWhatsappPairing } from '@/use-cases/start-whatsapp-pairing'

const NOW = new Date('2026-06-24T10:00:00.000Z')

function setup(code = '123456') {
  const channelIdentities = new InMemoryChannelIdentityRepository()
  const startWhatsappPairing = makeStartWhatsappPairing({
    channelIdentities,
    codes: { generate: () => code },
    ids: { generate: () => ID.verification },
    clock: new FixedClock(NOW),
  })
  return { channelIdentities, startWhatsappPairing }
}

const TARGET = '5511999990000'

describe('startWhatsappPairing', () => {
  it('creates a pending identity with a fresh code and target that expires', async () => {
    const { channelIdentities, startWhatsappPairing } = setup('123456')
    const result = await startWhatsappPairing(ID.user, '+55 11 99999-0000')
    expect(result).toEqual({
      status: 'pending',
      code: '123456',
      expiresAt: new Date('2026-06-24T10:10:00.000Z'),
      target: '+5511999990000',
    })
    const stored = await channelIdentities.findByUser(
      asEntityId(ID.user),
      'whatsapp',
    )
    expect(stored?.pairingCode).toBe('123456')
    expect(stored?.targetAddress).toBe('+5511999990000')
    expect(stored?.isCodeExpired(new Date('2026-06-24T10:11:00.000Z'))).toBe(
      true,
    )
  })

  it('rejects an invalid target number', async () => {
    const { startWhatsappPairing } = setup()
    await expect(startWhatsappPairing(ID.user, 'not-a-phone')).rejects.toThrow(
      ValidationError,
    )
  })

  it('regenerates the code and target on an existing pending identity', async () => {
    const { channelIdentities, startWhatsappPairing } = setup('999000')
    await channelIdentities.save(
      ChannelIdentity.create({
        id: ID.verification,
        userId: asEntityId(ID.user),
        channel: 'whatsapp',
        targetAddress: '5511111110000',
        pairingCode: '111111',
        pairingExpiresAt: new Date('2026-06-24T09:30:00.000Z'),
        now: NOW,
      }),
    )
    const result = await startWhatsappPairing(ID.user, TARGET)
    expect(result).toEqual({
      status: 'pending',
      code: '999000',
      expiresAt: new Date('2026-06-24T10:10:00.000Z'),
      target: '+5511999990000',
    })
    const stored = await channelIdentities.findByUser(
      asEntityId(ID.user),
      'whatsapp',
    )
    expect(stored?.targetAddress).toBe('+5511999990000')
  })

  it('reports a linked identity without issuing a code', async () => {
    const { channelIdentities, startWhatsappPairing } = setup()
    const identity = ChannelIdentity.create({
      id: ID.verification,
      userId: asEntityId(ID.user),
      channel: 'whatsapp',
      targetAddress: TARGET,
      pairingCode: '111111',
      pairingExpiresAt: new Date('2026-06-24T10:10:00.000Z'),
      now: NOW,
    })
    identity.verify('5511999990000', NOW)
    await channelIdentities.save(identity)
    const result = await startWhatsappPairing(ID.user, TARGET)
    expect(result).toEqual({ status: 'linked', address: '+5511999990000' })
  })
})
