import { describe, expect, it, vi } from 'vitest'
import {
  ChannelIdentity,
  User,
  asEntityId,
  type Entitlement,
} from '@lifedeck/domain'
import { InMemoryChannelIdentityRepository } from '@/testing/in-memory-channel-identity-repository'
import { InMemoryConversationStore } from '@/testing/in-memory-conversation-store'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import {
  MediaUnderstandingUnavailableError,
  QuotaExceededError,
} from '@/errors/use-case-error'
import { FixedClock, ID } from '@/testing/fakes'
import {
  ASSISTANT_ERROR_MESSAGE,
  ASSISTANT_LOCKED_MESSAGE,
  ASSISTANT_MEDIA_UNAVAILABLE_MESSAGE,
  ASSISTANT_QUOTA_MESSAGE,
  PAIR_GUIDANCE_MESSAGE,
  PAIR_LINKED_MESSAGE,
  PAIR_WRONG_NUMBER_MESSAGE,
  WHATSAPP_COPY,
  makeHandleInboundWhatsApp,
} from '@/use-cases/handle-inbound-whatsapp'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const FROM = '5511999990000'

type Options = {
  entitled?: boolean
  grants?: Entitlement[]
  consumeCredits?: (userId: string, operation: string) => Promise<unknown>
  agentRun?: () => Promise<{ text: string }>
  mediaAvailable?: boolean
  userLocale?: string
}

function setup(options: Options = {}) {
  const channelIdentities = new InMemoryChannelIdentityRepository()
  const users = new InMemoryUserRepository()
  if (options.userLocale) {
    const user = User.createGuest({
      id: ID.user,
      displayName: 'Tester',
      locale: options.userLocale,
      createdAt: NOW,
    })
    void users.save(user)
  }
  const conversations = new InMemoryConversationStore()
  const sendText = vi.fn().mockResolvedValue(undefined)
  const sendTemplate = vi.fn().mockResolvedValue(undefined)
  const fetchMedia = vi
    .fn()
    .mockResolvedValue({ data: new ArrayBuffer(8), mimeType: 'audio/ogg' })
  const consume = vi.fn(options.consumeCredits ?? (async () => ({})))
  const refund = vi.fn(async () => ({}))
  const run = vi.fn(options.agentRun ?? (async () => ({ text: 'Done.' })))
  const transcribe = vi.fn().mockResolvedValue('remind me to call mom')
  const describe = vi.fn().mockResolvedValue('a photo of a receipt')
  const mediaAvailable = options.mediaAvailable ?? true
  const handleInboundWhatsApp = makeHandleInboundWhatsApp({
    channelIdentities,
    users,
    messaging: { sendText, sendTemplate, fetchMedia },
    entitlements: {
      for: async () => ({
        plan: 'pro' as const,
        entitlements:
          options.grants ??
          (options.entitled === false
            ? []
            : (['whatsappAssistant'] as Entitlement[])),
      }),
    },
    consumeCredits: consume,
    refundCredits: refund,
    agent: { run },
    conversations,
    transcriber: { transcribe, isAvailable: () => mediaAvailable },
    visionReader: { describe, isAvailable: () => mediaAvailable },
    clock: new FixedClock(NOW),
  })
  return {
    channelIdentities,
    conversations,
    sendText,
    fetchMedia,
    consume,
    refund,
    run,
    transcribe,
    describe,
    handleInboundWhatsApp,
  }
}

function pending(
  code: string,
  pairingExpiresAt = new Date('2026-06-24T10:10:00.000Z'),
  targetAddress = FROM,
): ChannelIdentity {
  return ChannelIdentity.create({
    id: ID.verification,
    userId: asEntityId(ID.user),
    channel: 'whatsapp',
    targetAddress,
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
      kind: 'text',
      text: 'buy milk',
    })

    expect(result).toEqual({ action: 'reply' })
    expect(ctx.consume).toHaveBeenCalledWith(ID.user, 'assistantText')
    expect(ctx.run).toHaveBeenCalledWith({
      userId: ID.user,
      message: 'buy milk',
      history: [],
      model: 'flash',
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

    await ctx.handleInboundWhatsApp({ from: FROM, kind: 'text', text: 'again' })

    expect(ctx.run).toHaveBeenCalledWith({
      userId: ID.user,
      message: 'again',
      history: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
      ],
      model: 'flash',
    })
  })

  it('denies a verified number without the assistant entitlement', async () => {
    const ctx = setup({ entitled: false })
    await verified(ctx.channelIdentities)

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      kind: 'text',
      text: 'hi',
    })

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

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      kind: 'text',
      text: 'hi',
    })

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

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      kind: 'text',
      text: 'hi',
    })

    expect(result).toEqual({ action: 'error' })
    expect(ctx.sendText).toHaveBeenCalledWith(FROM, ASSISTANT_ERROR_MESSAGE)
    // The metered credit is refunded since the reply never happened, using the
    // same user and operation it was charged with.
    expect(ctx.consume).toHaveBeenCalledOnce()
    expect(ctx.refund).toHaveBeenCalledWith(
      ...(ctx.consume.mock.calls[0] ?? []),
    )
  })

  it('links a number when the text matches a pending code', async () => {
    const ctx = setup()
    await ctx.channelIdentities.save(pending('123456'))

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      kind: 'text',
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

  it('links when the code arrives inside the friendly pairing sentence', async () => {
    const ctx = setup()
    await ctx.channelIdentities.save(pending('123456'))

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      kind: 'text',
      text: 'Olá! Quero ativar meu assistente do Life Deck. Meu código: 123456',
    })

    expect(result).toEqual({ action: 'linked' })
    const linked = await ctx.channelIdentities.findByAddress(
      'whatsapp',
      '+5511999990000',
    )
    expect(linked?.isVerified()).toBe(true)
  })

  it('refuses to link when the code is sent from a number other than the target', async () => {
    const ctx = setup()
    await ctx.channelIdentities.save(
      pending('123456', undefined, '5511777770000'),
    )

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      kind: 'text',
      text: '123456',
    })

    expect(result).toEqual({ action: 'mismatch' })
    expect(ctx.sendText).toHaveBeenCalledWith(FROM, PAIR_WRONG_NUMBER_MESSAGE)
    const stored = await ctx.channelIdentities.findByAddress(
      'whatsapp',
      '+5511999990000',
    )
    expect(stored).toBeNull()
  })

  it('guides instead of linking when the code has expired', async () => {
    const ctx = setup()
    await ctx.channelIdentities.save(
      pending('123456', new Date('2026-06-24T09:50:00.000Z')),
    )

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      kind: 'text',
      text: '123456',
    })

    expect(result).toEqual({ action: 'guidance' })
    expect(ctx.sendText).toHaveBeenCalledWith(FROM, PAIR_GUIDANCE_MESSAGE)
  })

  it('guides an unlinked number with no matching code', async () => {
    const ctx = setup()

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      kind: 'text',
      text: 'hello',
    })

    expect(result).toEqual({ action: 'guidance' })
    expect(ctx.sendText).toHaveBeenCalledWith(FROM, PAIR_GUIDANCE_MESSAGE)
  })

  it('guides an unknown number in the language it wrote in', async () => {
    const ctx = setup()

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      kind: 'text',
      text: 'oi',
    })

    expect(result).toEqual({ action: 'guidance' })
    expect(ctx.sendText).toHaveBeenCalledWith(
      FROM,
      WHATSAPP_COPY.pt.pairGuidance,
    )
  })

  it('replies to a paired number in the language of the message', async () => {
    const ctx = setup({ entitled: false, userLocale: 'es' })
    await verified(ctx.channelIdentities)

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      kind: 'text',
      text: 'hello there, can you help me?',
    })

    expect(result).toEqual({ action: 'denied' })
    expect(ctx.sendText).toHaveBeenCalledWith(
      FROM,
      WHATSAPP_COPY.en.assistantLocked,
    )
  })

  it('answers a Portuguese message in Portuguese even with an English account', async () => {
    const ctx = setup({ entitled: false, userLocale: 'en' })
    await verified(ctx.channelIdentities)

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      kind: 'text',
      text: 'o que tenho de tarefas para amanhã?',
    })

    expect(result).toEqual({ action: 'denied' })
    expect(ctx.sendText).toHaveBeenCalledWith(
      FROM,
      WHATSAPP_COPY.pt.assistantLocked,
    )
  })

  it('routes a long text from a premium user to the pro model', async () => {
    const ctx = setup({ grants: ['whatsappAssistant', 'premiumModel'] })
    await verified(ctx.channelIdentities)

    await ctx.handleInboundWhatsApp({
      from: FROM,
      kind: 'text',
      text: 'please plan a detailed week of workouts and meals for me today',
    })

    expect(ctx.consume).toHaveBeenCalledWith(ID.user, 'assistantPro')
    expect(ctx.run).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'pro' }),
    )
  })

  it('keeps a short premium text on the flash model', async () => {
    const ctx = setup({ grants: ['whatsappAssistant', 'premiumModel'] })
    await verified(ctx.channelIdentities)

    await ctx.handleInboundWhatsApp({ from: FROM, kind: 'text', text: 'hi' })

    expect(ctx.consume).toHaveBeenCalledWith(ID.user, 'assistantText')
    expect(ctx.run).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'flash' }),
    )
  })

  it('transcribes an audio message and meters it as audio', async () => {
    const ctx = setup()
    await verified(ctx.channelIdentities)

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      kind: 'audio',
      mediaId: 'media-1',
    })

    expect(result).toEqual({ action: 'reply' })
    expect(ctx.fetchMedia).toHaveBeenCalledWith('media-1')
    expect(ctx.transcribe).toHaveBeenCalled()
    expect(ctx.consume).toHaveBeenCalledWith(ID.user, 'audioTranscription')
    expect(ctx.run).toHaveBeenCalledWith({
      userId: ID.user,
      message: 'remind me to call mom',
      history: [],
      model: 'flash',
    })
  })

  it('reads an image message and meters it as vision', async () => {
    const ctx = setup()
    await verified(ctx.channelIdentities)

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      kind: 'image',
      mediaId: 'media-2',
    })

    expect(result).toEqual({ action: 'reply' })
    expect(ctx.describe).toHaveBeenCalled()
    expect(ctx.consume).toHaveBeenCalledWith(ID.user, 'imageVision')
    const stored = await ctx.conversations.load(ID.user)
    expect(stored[0]).toEqual({
      role: 'user',
      content: 'a photo of a receipt',
    })
  })

  it('refuses audio without metering when transcription is unconfigured', async () => {
    const ctx = setup({ mediaAvailable: false })
    await verified(ctx.channelIdentities)

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      kind: 'audio',
      mediaId: 'media-3',
    })

    expect(result).toEqual({ action: 'unconfigured' })
    expect(ctx.sendText).toHaveBeenCalledWith(
      FROM,
      ASSISTANT_MEDIA_UNAVAILABLE_MESSAGE,
    )
    // No credit is spent and the media is never fetched or transcribed.
    expect(ctx.consume).not.toHaveBeenCalled()
    expect(ctx.fetchMedia).not.toHaveBeenCalled()
    expect(ctx.transcribe).not.toHaveBeenCalled()
    expect(ctx.run).not.toHaveBeenCalled()
  })

  it('refuses images without metering when vision is unconfigured', async () => {
    const ctx = setup({ mediaAvailable: false })
    await verified(ctx.channelIdentities)

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      kind: 'image',
      mediaId: 'media-4',
    })

    expect(result).toEqual({ action: 'unconfigured' })
    expect(ctx.consume).not.toHaveBeenCalled()
    expect(ctx.describe).not.toHaveBeenCalled()
  })

  it('replies clearly when media understanding fails at runtime', async () => {
    const ctx = setup()
    await verified(ctx.channelIdentities)
    ctx.transcribe.mockRejectedValueOnce(
      new MediaUnderstandingUnavailableError('audio'),
    )

    const result = await ctx.handleInboundWhatsApp({
      from: FROM,
      kind: 'audio',
      mediaId: 'media-3',
    })

    expect(result).toEqual({ action: 'unconfigured' })
    expect(ctx.sendText).toHaveBeenCalledWith(
      FROM,
      ASSISTANT_MEDIA_UNAVAILABLE_MESSAGE,
    )
    expect(ctx.run).not.toHaveBeenCalled()
  })
})
