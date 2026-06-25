import { describe, expect, it, vi } from 'vitest'
import { ChannelIdentity, asEntityId } from '@lifedeck/domain'
import { InMemoryChannelIdentityRepository } from '@/testing/in-memory-channel-identity-repository'
import { InMemoryConversationStore } from '@/testing/in-memory-conversation-store'
import { QuotaExceededError } from '@/errors/use-case-error'
import { FixedClock, ID } from '@/testing/fakes'
import {
  ASSISTANT_ERROR_MESSAGE,
  ASSISTANT_LOCKED_MESSAGE,
  ASSISTANT_QUOTA_MESSAGE,
  PAIR_GUIDANCE_MESSAGE,
  PAIR_LINKED_MESSAGE,
  makeHandleInboundWhatsApp,
} from '@/use-cases/handle-inbound-whatsapp'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const FROM = '5511999990000'

type Options = {
  entitled?: boolean
  consumeCredits?: (
    userId: string,
    operation: 'assistantText',
  ) => Promise<unknown>
  agentRun?: () => Promise<{ text: string }>
}

function setup(options: Options = {}) {
  const channelIdentities = new InMemoryChannelIdentityRepository()
  const conversations = new InMemoryConversationStore()
  const sendText = vi.fn().mockResolvedValue(undefined)
  const consume = vi.fn(options.consumeCredits ?? (async () => ({})))
  const run = vi.fn(options.agentRun ?? (async () => ({ text: 'Done.' })))
  const handleInboundWhatsApp = makeHandleInboundWhatsApp({
    channelIdentities,
    messaging: { sendText },
    entitlements: {
      for: async () => ({
        plan: 'pro',
        entitlements: options.entitled === false ? [] : ['whatsappAssistant'],
      }),
    },
    consumeCredits: consume,
    agent: { run },
    conversations,
    clock: new FixedClock(NOW),
  })
  return {
    channelIdentities,
    conversations,
    sendText,
    consume,
    run,
    handleInboundWhatsApp,
  }
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

async function verified(
  channelIdentities: InMemoryChannelIdentityRepository,
): Promise<void> {
  const identity = pending('111111')
  identity.verify(FROM, NOW)
  await channelIdentities.save(identity)
}

describe('handleInboundWhatsApp', () => {
  it('runs the assistant for a verified, entitled number', async () => {
    const ctx = setup({ agentRun: async () => ({ text: 'Added milk.' }) })
    await verified(ctx.channelIdentities)

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      text: 'buy milk',
    })

    expect(result).toEqual({ action: 'reply' })
    expect(ctx.consume).toHaveBeenCalledWith(ID.user, 'assistantText')
    expect(ctx.run).toHaveBeenCalledWith({
      userId: ID.user,
      message: 'buy milk',
      history: [],
    })
    expect(ctx.sendText).toHaveBeenCalledWith(FROM, 'Added milk.')
    const stored = await ctx.conversations.load(ID.user)
    expect(stored).toEqual([
      { role: 'user', content: 'buy milk' },
      { role: 'assistant', content: 'Added milk.' },
    ])
  })

  it('passes prior history to the agent', async () => {
    const ctx = setup()
    await verified(ctx.channelIdentities)
    await ctx.conversations.append(ID.user, [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ])

    await ctx.handleInboundWhatsApp({ from: FROM, text: 'again' })

    expect(ctx.run).toHaveBeenCalledWith({
      userId: ID.user,
      message: 'again',
      history: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
      ],
    })
  })

  it('denies a verified number without the assistant entitlement', async () => {
    const ctx = setup({ entitled: false })
    await verified(ctx.channelIdentities)

    const result = await ctx.handleInboundWhatsApp({ from: FROM, text: 'hi' })

    expect(result).toEqual({ action: 'denied' })
    expect(ctx.sendText).toHaveBeenCalledWith(FROM, ASSISTANT_LOCKED_MESSAGE)
    expect(ctx.run).not.toHaveBeenCalled()
  })

  it('replies with the quota message when credits are exhausted', async () => {
    const ctx = setup({
      consumeCredits: async () => {
        throw new QuotaExceededError('fiveHour', 5, 5)
      },
    })
    await verified(ctx.channelIdentities)

    const result = await ctx.handleInboundWhatsApp({ from: FROM, text: 'hi' })

    expect(result).toEqual({ action: 'quota' })
    expect(ctx.sendText).toHaveBeenCalledWith(FROM, ASSISTANT_QUOTA_MESSAGE)
    expect(ctx.run).not.toHaveBeenCalled()
  })

  it('replies with an error message when the agent throws', async () => {
    const ctx = setup({
      agentRun: async () => {
        throw new Error('model down')
      },
    })
    await verified(ctx.channelIdentities)

    const result = await ctx.handleInboundWhatsApp({ from: FROM, text: 'hi' })

    expect(result).toEqual({ action: 'error' })
    expect(ctx.sendText).toHaveBeenCalledWith(FROM, ASSISTANT_ERROR_MESSAGE)
  })

  it('links a number when the text matches a pending code', async () => {
    const ctx = setup()
    await ctx.channelIdentities.save(pending('123456'))

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      text: ' 123456 ',
    })

    expect(result).toEqual({ action: 'linked' })
    expect(ctx.sendText).toHaveBeenCalledWith(FROM, PAIR_LINKED_MESSAGE)
    const linked = await ctx.channelIdentities.findByAddress(
      'whatsapp',
      '+5511999990000',
    )
    expect(linked?.isVerified()).toBe(true)
  })

  it('guides instead of linking when the code has expired', async () => {
    const ctx = setup()
    await ctx.channelIdentities.save(
      pending('123456', new Date('2026-06-24T09:50:00.000Z')),
    )

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      text: '123456',
    })

    expect(result).toEqual({ action: 'guidance' })
    expect(ctx.sendText).toHaveBeenCalledWith(FROM, PAIR_GUIDANCE_MESSAGE)
  })

  it('guides an unlinked number with no matching code', async () => {
    const ctx = setup()

    const result = await ctx.handleInboundWhatsApp({ from: FROM, text: 'oi' })

    expect(result).toEqual({ action: 'guidance' })
    expect(ctx.sendText).toHaveBeenCalledWith(FROM, PAIR_GUIDANCE_MESSAGE)
  })
})
