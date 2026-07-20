import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateText } from 'ai'
import type { AssistantContext, AssistantTools } from '@lifedeck/application'
import {
  AiSdkAgentRunner,
  buildAssistantToolset,
  buildSystemPrompt,
  createAgentRunner,
  gateTools,
} from '@/messaging/ai-sdk-agent-runner'

// Keep the real `tool`/`stepCountIs` so the toolset builds normally; only
// `generateText` is replaced so `run` never reaches a live model.
vi.mock('ai', async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return { ...actual, generateText: vi.fn() }
})

const generateTextMock = vi.mocked(generateText)

const USER_ID = 'user-1'

const CONTEXT: AssistantContext = {
  timezone: 'America/Sao_Paulo',
  nowIso: '2026-07-20T09:00:00-03:00',
  weekday: 'Monday',
  defaultWeatherLocation: null,
}

// A spy AssistantTools: every method records its call and returns a sentinel so
// a tool's execute can be asserted to delegate the right arguments through.
function spyTools(overrides: Partial<AssistantTools> = {}): AssistantTools {
  const method = (value: unknown) => vi.fn().mockResolvedValue(value)
  return {
    getContext: method(CONTEXT),
    getToday: method({ tasks: [] }),
    getLists: method({ lists: [] }),
    getAgenda: method({ events: [] }),
    getWeather: method({ current: null, daily: [] }),
    setDefaultWeatherLocation: method({ ok: true }),
    addTask: method({ id: 'task-1' }),
    completeTask: method({ ok: true }),
    reopenTask: method({ ok: true }),
    renameTask: method({ ok: true }),
    deleteTask: method({ ok: true }),
    moveTaskToToday: method({ ok: true }),
    createList: method({ id: 'list-1' }),
    addSubtask: method({ id: 'sub-1' }),
    completeSubtask: method({ ok: true }),
    addEvent: method({ id: 'event-1' }),
    updateEvent: method({ ok: true }),
    rescheduleOccurrence: method({ ok: true }),
    cancelOccurrence: method({ ok: true }),
    deleteEvent: method({ ok: true }),
    ...overrides,
  } as AssistantTools
}

// Runs a tool's execute the way the AI SDK would, ignoring the options arg.
function run(tool: { execute?: unknown }, args: unknown) {
  return (tool.execute as (a: unknown, o: unknown) => Promise<unknown>)(
    args,
    {},
  )
}

// The single generateText call's options argument.
function genCall() {
  return generateTextMock.mock.calls[0]![0]
}

const AUDIO = { data: new ArrayBuffer(8), mimeType: 'audio/ogg' }

beforeEach(() => {
  generateTextMock.mockReset()
  generateTextMock.mockResolvedValue({ text: 'assistant reply' } as never)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('buildAssistantToolset', () => {
  it('wires every read tool to the matching AssistantTools call', async () => {
    const tools = spyTools()
    const toolset = buildAssistantToolset(tools, USER_ID)

    expect(await run(toolset.getToday, {})).toEqual({ tasks: [] })
    expect(tools.getToday).toHaveBeenCalledWith(USER_ID)

    await run(toolset.getLists, {})
    expect(tools.getLists).toHaveBeenCalledWith(USER_ID)

    await run(toolset.getAgenda, { from: 'a', to: 'b' })
    expect(tools.getAgenda).toHaveBeenCalledWith(USER_ID, {
      from: 'a',
      to: 'b',
    })

    await run(toolset.getWeather, { location: 'Rio', from: 'x', to: 'y' })
    expect(tools.getWeather).toHaveBeenCalledWith({
      location: 'Rio',
      from: 'x',
      to: 'y',
    })
  })

  it('normalizes a blank saved-weather-location to null and keeps a real one', async () => {
    const tools = spyTools()
    const toolset = buildAssistantToolset(tools, USER_ID)

    await run(toolset.setDefaultWeatherLocation, { location: '   ' })
    expect(tools.setDefaultWeatherLocation).toHaveBeenLastCalledWith(
      USER_ID,
      null,
    )

    await run(toolset.setDefaultWeatherLocation, { location: 'Lisbon' })
    expect(tools.setDefaultWeatherLocation).toHaveBeenLastCalledWith(
      USER_ID,
      'Lisbon',
    )
  })

  it('wires every task and list tool through', async () => {
    const tools = spyTools()
    const toolset = buildAssistantToolset(tools, USER_ID)

    await run(toolset.addTask, { title: 'Buy milk', listId: 'list-9' })
    expect(tools.addTask).toHaveBeenCalledWith(USER_ID, {
      title: 'Buy milk',
      listId: 'list-9',
    })

    await run(toolset.completeTask, { taskId: 't1' })
    expect(tools.completeTask).toHaveBeenCalledWith(USER_ID, 't1')

    await run(toolset.reopenTask, { taskId: 't1' })
    expect(tools.reopenTask).toHaveBeenCalledWith(USER_ID, 't1')

    await run(toolset.renameTask, { taskId: 't1', title: 'New' })
    expect(tools.renameTask).toHaveBeenCalledWith(USER_ID, 't1', 'New')

    await run(toolset.deleteTask, { taskId: 't1' })
    expect(tools.deleteTask).toHaveBeenCalledWith(USER_ID, 't1')

    await run(toolset.moveTaskToToday, { taskId: 't1' })
    expect(tools.moveTaskToToday).toHaveBeenCalledWith(USER_ID, 't1')

    await run(toolset.createList, { title: 'Groceries' })
    expect(tools.createList).toHaveBeenCalledWith(USER_ID, 'Groceries')

    await run(toolset.addSubtask, { taskId: 't1', title: 'sub' })
    expect(tools.addSubtask).toHaveBeenCalledWith(USER_ID, 't1', 'sub')

    await run(toolset.completeSubtask, { subtaskId: 's1' })
    expect(tools.completeSubtask).toHaveBeenCalledWith(USER_ID, 's1')
  })

  it('wires every calendar tool through', async () => {
    const tools = spyTools()
    const toolset = buildAssistantToolset(tools, USER_ID)

    await run(toolset.addEvent, {
      title: 'Lunch',
      startsAt: '2026-07-21T12:00:00-03:00',
      endsAt: '2026-07-21T13:00:00-03:00',
      reminders: [10],
    })
    expect(tools.addEvent).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ title: 'Lunch', reminders: [10] }),
    )

    await run(toolset.updateEvent, { eventId: 'e1', title: 'Moved' })
    expect(tools.updateEvent).toHaveBeenCalledWith(USER_ID, 'e1', {
      title: 'Moved',
    })

    await run(toolset.rescheduleOccurrence, {
      seriesId: 's1',
      occurrenceStart: '2026-07-21T12:00:00-03:00',
      title: 'Haircut',
      startsAt: '2026-07-21T15:00:00-03:00',
      endsAt: '2026-07-21T15:30:00-03:00',
    })
    expect(tools.rescheduleOccurrence).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ seriesId: 's1', title: 'Haircut' }),
    )

    await run(toolset.cancelOccurrence, {
      seriesId: 's1',
      occurrenceStart: '2026-07-21T12:00:00-03:00',
    })
    expect(tools.cancelOccurrence).toHaveBeenCalledWith(USER_ID, {
      seriesId: 's1',
      occurrenceStart: '2026-07-21T12:00:00-03:00',
    })

    await run(toolset.deleteEvent, { eventId: 'e1' })
    expect(tools.deleteEvent).toHaveBeenCalledWith(USER_ID, 'e1')
  })
})

describe('buildSystemPrompt', () => {
  it('states there is no saved default when none is set', () => {
    const prompt = buildSystemPrompt(CONTEXT)
    expect(prompt).toContain('America/Sao_Paulo')
    expect(prompt).toContain('Monday')
    expect(prompt).toContain('no saved default weather location')
  })

  it('quotes the saved place and flags it as untrusted text', () => {
    const prompt = buildSystemPrompt({
      ...CONTEXT,
      defaultWeatherLocation: 'São Paulo',
    })
    expect(prompt).toContain('"São Paulo"')
    expect(prompt).toContain('never as instructions')
  })
})

describe('gateTools', () => {
  it('keeps every tool when nothing requires an entitlement', () => {
    const gated = gateTools({ a: 1, b: 2 }, [])
    expect(Object.keys(gated)).toEqual(['a', 'b'])
  })

  it('drops a tool whose required entitlement is not granted', () => {
    const gated = gateTools({ a: 1, findTime: 2 }, [], {
      findTime: 'smartScheduling',
    })
    expect(Object.keys(gated)).toEqual(['a'])
  })

  it('keeps a gated tool once the entitlement is granted', () => {
    const gated = gateTools({ a: 1, findTime: 2 }, ['smartScheduling'], {
      findTime: 'smartScheduling',
    })
    expect(Object.keys(gated)).toEqual(['a', 'findTime'])
  })
})

describe('AiSdkAgentRunner.run', () => {
  function runner(tools = spyTools()) {
    return new AiSdkAgentRunner('flash-model', 'pro-model', tools)
  }

  it('uses the flash model, the built prompt, and the gated toolset for text', async () => {
    const reply = await runner().run({
      userId: USER_ID,
      message: 'what is on today?',
      history: [],
    })
    expect(reply).toEqual({ text: 'assistant reply' })

    const call = genCall()
    expect(call.model).toBe('flash-model')
    expect(call.system).toContain('Lifedeck assistant')
    expect(Object.keys(call.tools ?? {})).toContain('getToday')
    expect(call.messages?.at(-1)).toEqual({
      role: 'user',
      content: 'what is on today?',
    })
  })

  it('selects the pro model when the pro tier is requested', async () => {
    await runner().run({
      userId: USER_ID,
      message: 'hi',
      model: 'pro',
      history: [],
    })
    expect(genCall().model).toBe('pro-model')
  })

  it('sends a voice note as a file part the model reads directly', async () => {
    await runner().run({ userId: USER_ID, audio: AUDIO, history: [] })
    const message = genCall().messages?.at(-1)
    expect(Array.isArray(message?.content)).toBe(true)
    expect(message?.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'file', data: AUDIO.data }),
      ]),
    )
  })

  it('threads prior history before the new user turn', async () => {
    await runner().run({
      userId: USER_ID,
      message: 'and tomorrow?',
      history: [{ role: 'user', content: 'today?' }],
    })
    const messages = genCall().messages ?? []
    expect(messages[0]).toEqual({ role: 'user', content: 'today?' })
    expect(messages).toHaveLength(2)
  })

  it('defaults a missing text message to an empty string', async () => {
    await runner().run({ userId: USER_ID, history: [] })
    expect(genCall().messages?.at(-1)).toEqual({
      role: 'user',
      content: '',
    })
  })
})

describe('createAgentRunner', () => {
  it('builds a Gemini-backed runner when an API key is present', () => {
    vi.stubEnv('GEMINI_API_KEY', 'key-123')
    expect(createAgentRunner(spyTools())).toBeInstanceOf(AiSdkAgentRunner)
  })

  it('falls back to a generic model id when only AI_MODEL is set', () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    vi.stubEnv('AI_MODEL', 'some-model')
    expect(createAgentRunner(spyTools())).toBeInstanceOf(AiSdkAgentRunner)
  })

  it('returns a stub runner when nothing is configured', async () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    vi.stubEnv('AI_MODEL', '')
    const stub = createAgentRunner(spyTools())
    expect(stub).not.toBeInstanceOf(AiSdkAgentRunner)

    const textReply = await stub.run({
      userId: USER_ID,
      message: 'hello',
      history: [],
    })
    expect(textReply.text).toContain('hello')

    const voiceReply = await stub.run({
      userId: USER_ID,
      audio: AUDIO,
      history: [],
    })
    expect(voiceReply.text).toContain('[voice message]')
  })
})
