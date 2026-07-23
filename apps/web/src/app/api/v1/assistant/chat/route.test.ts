// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const handleInAppMessage = vi.fn()
const getUserIdFromRequest = vi.fn()
const checkAssistantRateLimit = vi.fn()

vi.mock('@/server/container', () => ({
  getContainer: () => ({ handleInAppMessage }),
}))

vi.mock('@/server/session/session', () => ({
  getUserIdFromRequest: (request: Request) => getUserIdFromRequest(request),
}))

vi.mock('@/server/api/rate-limit', () => ({
  checkAssistantRateLimit: (id: string) => checkAssistantRateLimit(id),
  rateLimitHeaders: () => ({}),
}))

import { POST } from './route'

function jsonRequest(body: unknown): Request {
  return new Request('https://app.test/api/v1/assistant/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  getUserIdFromRequest.mockResolvedValue('user-1')
  checkAssistantRateLimit.mockResolvedValue({
    ok: true,
    limit: 15,
    remaining: 14,
    reset: 0,
  })
  handleInAppMessage.mockResolvedValue({
    status: 'reply',
    text: 'Added milk.',
    actions: [{ tool: 'addTask', result: { id: 't1' } }],
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('assistant chat route', () => {
  it('returns the reply text and action cards', async () => {
    const response = await POST(jsonRequest({ text: 'buy milk', locale: 'pt' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: {
        text: 'Added milk.',
        actions: [{ tool: 'addTask', result: { id: 't1' } }],
      },
    })
    expect(handleInAppMessage).toHaveBeenCalledWith({
      userId: 'user-1',
      kind: 'text',
      text: 'buy milk',
      locale: 'pt',
    })
  })

  it('rejects an unauthenticated request with 401', async () => {
    getUserIdFromRequest.mockResolvedValue(null)
    const response = await POST(jsonRequest({ text: 'hi' }))
    expect(response.status).toBe(401)
    expect(handleInAppMessage).not.toHaveBeenCalled()
  })

  it('rejects a throttled caller with 429', async () => {
    checkAssistantRateLimit.mockResolvedValue({
      ok: false,
      limit: 15,
      remaining: 0,
      reset: 0,
    })
    const response = await POST(jsonRequest({ text: 'hi' }))
    expect(response.status).toBe(429)
    expect(handleInAppMessage).not.toHaveBeenCalled()
  })

  it('maps an empty message to a 422 validation failure', async () => {
    const response = await POST(jsonRequest({ text: '   ' }))
    expect(response.status).toBe(422)
    expect(handleInAppMessage).not.toHaveBeenCalled()
  })

  it('maps a denied plan to 403', async () => {
    handleInAppMessage.mockResolvedValue({ status: 'denied' })
    const response = await POST(jsonRequest({ text: 'hi' }))
    expect(response.status).toBe(403)
  })

  it('maps quota exhaustion to 429', async () => {
    handleInAppMessage.mockResolvedValue({ status: 'quota' })
    const response = await POST(jsonRequest({ text: 'hi' }))
    expect(response.status).toBe(429)
  })

  it('maps a busy model to 429', async () => {
    handleInAppMessage.mockResolvedValue({ status: 'busy' })
    const response = await POST(jsonRequest({ text: 'hi' }))
    expect(response.status).toBe(429)
  })

  it('maps an unsupported message to 422', async () => {
    handleInAppMessage.mockResolvedValue({ status: 'unconfigured' })
    const response = await POST(jsonRequest({ text: 'hi' }))
    expect(response.status).toBe(422)
  })

  it('maps an internal failure to 500', async () => {
    handleInAppMessage.mockResolvedValue({ status: 'error' })
    const response = await POST(jsonRequest({ text: 'hi' }))
    expect(response.status).toBe(500)
  })
})
