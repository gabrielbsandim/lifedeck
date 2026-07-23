import { describe, expect, it, vi } from 'vitest'
import type { Entitlement } from '@lifedeck/domain'
import { InMemoryConversationStore } from '@/testing/in-memory-conversation-store'
import {
  MediaUnderstandingUnavailableError,
  QuotaExceededError,
} from '@/errors/use-case-error'
import type { AgentAction } from '@/ports/agent-runner'
import { makeHandleInAppMessage } from '@/use-cases/handle-in-app-message'

const USER = 'user-1'

const MEDIA = { data: new ArrayBuffer(8), mimeType: 'audio/ogg' }
const IMAGE = { data: new ArrayBuffer(8), mimeType: 'image/jpeg' }

type Options = {
  entitled?: boolean
  grants?: Entitlement[]
  consumeCredits?: (userId: string, operation: string) => Promise<unknown>
  agentRun?: () => Promise<{ text: string; actions?: AgentAction[] }>
  mediaAvailable?: boolean
}

function setup(options: Options = {}) {
  const conversations = new InMemoryConversationStore()
  const consume = vi.fn(options.consumeCredits ?? (async () => ({})))
  const refund = vi.fn(async () => ({}))
  const run = vi.fn(options.agentRun ?? (async () => ({ text: 'Done.' })))
  const transcribe = vi.fn().mockResolvedValue('remind me to call mom')
  const describe = vi.fn().mockResolvedValue('a photo of a receipt')
  const mediaAvailable = options.mediaAvailable ?? true
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
  const handleInAppMessage = makeHandleInAppMessage({
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
    logger,
  })
  return {
    conversations,
    consume,
    refund,
    run,
    transcribe,
    describe,
    logger,
    handleInAppMessage,
  }
}

describe('handleInAppMessage', () => {
  it('runs the assistant for an entitled user and returns text with actions', async () => {
    const actions: AgentAction[] = [
      { tool: 'addTask', input: { title: 'milk' }, result: { id: 't1' } },
    ]
    const ctx = setup({
      agentRun: async () => ({ text: 'Added milk.', actions }),
    })

    const result = await ctx.handleInAppMessage({
      userId: USER,
      kind: 'text',
      text: 'buy milk',
    })

    expect(result).toEqual({
      status: 'reply',
      text: 'Added milk.',
      actions,
    })
    expect(ctx.consume).toHaveBeenCalledWith(USER, 'assistantText')
    expect(ctx.run).toHaveBeenCalledWith({
      userId: USER,
      message: 'buy milk',
      history: [],
      model: 'flash',
      entitlements: ['whatsappAssistant'],
    })
    const stored = await ctx.conversations.load(USER)
    expect(stored).toEqual([
      { role: 'user', content: 'buy milk' },
      { role: 'assistant', content: 'Added milk.' },
    ])
  })

  it('returns an empty actions array when the agent surfaces none', async () => {
    const ctx = setup({ agentRun: async () => ({ text: 'Hi there.' }) })

    const result = await ctx.handleInAppMessage({
      userId: USER,
      kind: 'text',
      text: 'hello',
    })

    expect(result).toEqual({
      status: 'reply',
      text: 'Hi there.',
      actions: [],
    })
  })

  it('shares conversation history across turns', async () => {
    const ctx = setup({ agentRun: async () => ({ text: 'Ok.' }) })
    await ctx.conversations.append(USER, [
      { role: 'user', content: 'earlier' },
      { role: 'assistant', content: 'noted' },
    ])

    await ctx.handleInAppMessage({ userId: USER, kind: 'text', text: 'again' })

    expect(ctx.run).toHaveBeenCalledWith(
      expect.objectContaining({
        history: [
          { role: 'user', content: 'earlier' },
          { role: 'assistant', content: 'noted' },
        ],
      }),
    )
  })

  it('passes plan entitlements to the agent so tools can be gated', async () => {
    const ctx = setup({
      grants: ['whatsappAssistant', 'calendarSync', 'smartScheduling'],
    })

    await ctx.handleInAppMessage({ userId: USER, kind: 'text', text: 'hi' })

    expect(ctx.run).toHaveBeenCalledWith(
      expect.objectContaining({
        entitlements: ['whatsappAssistant', 'calendarSync', 'smartScheduling'],
      }),
    )
  })

  it('uses the pro model for a long text when premiumModel is granted', async () => {
    const ctx = setup({ grants: ['whatsappAssistant', 'premiumModel'] })

    await ctx.handleInAppMessage({
      userId: USER,
      kind: 'text',
      text: 'please plan my entire week around these five big deadlines',
    })

    expect(ctx.consume).toHaveBeenCalledWith(USER, 'assistantPro')
    expect(ctx.run).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'pro' }),
    )
  })

  it('denies a user without the assistant entitlement without metering', async () => {
    const ctx = setup({ entitled: false })

    const result = await ctx.handleInAppMessage({
      userId: USER,
      kind: 'text',
      text: 'hi',
    })

    expect(result).toEqual({ status: 'denied' })
    expect(ctx.consume).not.toHaveBeenCalled()
    expect(ctx.run).not.toHaveBeenCalled()
  })

  it('reports quota exhaustion without running the agent', async () => {
    const ctx = setup({
      consumeCredits: async () => {
        throw new QuotaExceededError('fiveHour', 10, 10)
      },
    })

    const result = await ctx.handleInAppMessage({
      userId: USER,
      kind: 'text',
      text: 'hi',
    })

    expect(result).toEqual({ status: 'quota' })
    expect(ctx.run).not.toHaveBeenCalled()
  })

  it('surfaces a metering-backend failure as an error without charging', async () => {
    const ctx = setup({
      consumeCredits: async () => {
        throw new Error('meter offline')
      },
    })

    const result = await ctx.handleInAppMessage({
      userId: USER,
      kind: 'text',
      text: 'hi',
    })

    expect(result).toEqual({ status: 'error' })
    expect(ctx.run).not.toHaveBeenCalled()
    expect(ctx.logger.error).toHaveBeenCalledWith(
      'in_app_metering_failed',
      expect.any(Object),
    )
  })

  it('refuses audio before metering when no transcriber is configured', async () => {
    const ctx = setup({ mediaAvailable: false })

    const result = await ctx.handleInAppMessage({
      userId: USER,
      kind: 'audio',
      audio: MEDIA,
    })

    expect(result).toEqual({ status: 'unconfigured' })
    expect(ctx.consume).not.toHaveBeenCalled()
  })

  it('understands a voice note directly, storing a voice-note marker turn', async () => {
    const ctx = setup({ agentRun: async () => ({ text: 'Reminder set.' }) })

    const result = await ctx.handleInAppMessage({
      userId: USER,
      kind: 'audio',
      audio: MEDIA,
    })

    expect(result).toEqual({
      status: 'reply',
      text: 'Reminder set.',
      actions: [],
    })
    expect(ctx.consume).toHaveBeenCalledWith(USER, 'audioTranscription')
    expect(ctx.run).toHaveBeenCalledWith(
      expect.objectContaining({ audio: MEDIA }),
    )
    expect(ctx.transcribe).not.toHaveBeenCalled()
    const stored = await ctx.conversations.load(USER)
    expect(stored).toEqual([
      { role: 'user', content: '[voice message]' },
      { role: 'assistant', content: 'Reminder set.' },
    ])
  })

  it('falls back to transcription when direct audio understanding fails', async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error('vision hiccup'))
      .mockResolvedValueOnce({ text: 'Reminder set.' })
    const ctx = setup()
    ctx.run.mockImplementation(run)

    const result = await ctx.handleInAppMessage({
      userId: USER,
      kind: 'audio',
      audio: MEDIA,
    })

    expect(result.status).toBe('reply')
    expect(ctx.transcribe).toHaveBeenCalledWith(MEDIA)
    expect(run).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: 'remind me to call mom' }),
    )
    const stored = await ctx.conversations.load(USER)
    expect(stored[0]).toEqual({
      role: 'user',
      content: 'remind me to call mom',
    })
  })

  it('describes an image and runs the description as the user turn', async () => {
    const ctx = setup({ agentRun: async () => ({ text: 'Logged receipt.' }) })

    const result = await ctx.handleInAppMessage({
      userId: USER,
      kind: 'image',
      image: IMAGE,
    })

    expect(result.status).toBe('reply')
    expect(ctx.consume).toHaveBeenCalledWith(USER, 'imageVision')
    expect(ctx.describe).toHaveBeenCalledWith(IMAGE)
    expect(ctx.run).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'a photo of a receipt' }),
    )
  })

  it('refunds the credit and reports busy on a model rate limit', async () => {
    const ctx = setup({
      agentRun: async () => {
        throw new Error('429 Too Many Requests')
      },
    })

    const result = await ctx.handleInAppMessage({
      userId: USER,
      kind: 'text',
      text: 'hi',
    })

    expect(result).toEqual({ status: 'busy' })
    expect(ctx.refund).toHaveBeenCalledWith(USER, 'assistantText')
  })

  it('refunds and reports unconfigured when the model cannot read the media', async () => {
    const ctx = setup({
      agentRun: async () => {
        throw new MediaUnderstandingUnavailableError('image')
      },
    })

    const result = await ctx.handleInAppMessage({
      userId: USER,
      kind: 'image',
      image: IMAGE,
    })

    expect(result).toEqual({ status: 'unconfigured' })
    expect(ctx.refund).toHaveBeenCalledWith(USER, 'imageVision')
  })

  it('refunds the credit and reports an error on an unexpected failure', async () => {
    const ctx = setup({
      agentRun: async () => {
        throw new Error('boom')
      },
    })

    const result = await ctx.handleInAppMessage({
      userId: USER,
      kind: 'text',
      text: 'hi',
    })

    expect(result).toEqual({ status: 'error' })
    expect(ctx.refund).toHaveBeenCalledWith(USER, 'assistantText')
    expect(ctx.logger.error).toHaveBeenCalledWith(
      'in_app_assistant_failed',
      expect.any(Object),
    )
  })

  it('confirms a wordless tool run with a localized acknowledgement', async () => {
    const ctx = setup({
      agentRun: async () => ({
        text: '   ',
        actions: [
          {
            tool: 'addTask',
            input: { title: 'milk' },
            result: { id: 't1', added: true },
          },
        ],
      }),
    })

    const result = await ctx.handleInAppMessage({
      userId: USER,
      locale: 'pt',
      kind: 'text',
      text: 'add milk',
    })

    expect(result).toEqual({
      status: 'reply',
      text: 'Feito.',
      actions: [
        {
          tool: 'addTask',
          input: { title: 'milk' },
          result: { id: 't1', added: true },
        },
      ],
    })
    const stored = await ctx.conversations.load(USER)
    expect(stored[1]).toEqual({ role: 'assistant', content: 'Feito.' })
  })

  it('still returns the reply when persisting history fails', async () => {
    const ctx = setup({ agentRun: async () => ({ text: 'Ok.' }) })
    vi.spyOn(ctx.conversations, 'append').mockRejectedValueOnce(
      new Error('store down'),
    )

    const result = await ctx.handleInAppMessage({
      userId: USER,
      kind: 'text',
      text: 'hi',
    })

    expect(result).toEqual({ status: 'reply', text: 'Ok.', actions: [] })
    expect(ctx.logger.error).toHaveBeenCalledWith(
      'in_app_history_append_failed',
      expect.any(Object),
    )
  })
})
