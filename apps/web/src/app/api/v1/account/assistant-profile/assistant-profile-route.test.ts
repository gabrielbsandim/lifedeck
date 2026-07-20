// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const setAssistantProfile = vi.fn()
const getUserIdFromRequest = vi.fn()

vi.mock('@/server/container', () => ({
  getContainer: () => ({ setAssistantProfile }),
}))

vi.mock('@/server/session/session', () => ({
  getUserIdFromRequest: (request: Request) => getUserIdFromRequest(request),
}))

import { PATCH } from './route'

function jsonRequest(body: unknown): Request {
  return new Request('https://app.test/api/v1/account/assistant-profile', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  getUserIdFromRequest.mockResolvedValue('user-1')
  setAssistantProfile.mockResolvedValue({ id: 'user-1' })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('assistant-profile route', () => {
  it('saves the memory patch for the authenticated user', async () => {
    const response = await PATCH(jsonRequest({ homeLocation: 'Lisbon' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: { id: 'user-1' } })
    expect(setAssistantProfile).toHaveBeenCalledWith('user-1', {
      homeLocation: 'Lisbon',
    })
  })

  it('rejects an unauthenticated request with 401', async () => {
    getUserIdFromRequest.mockResolvedValue(null)
    const response = await PATCH(jsonRequest({ homeLocation: 'Lisbon' }))
    expect(response.status).toBe(401)
    expect(setAssistantProfile).not.toHaveBeenCalled()
  })

  it('maps a validation failure to a 422', async () => {
    const { ValidationError } = await import('@lifedeck/domain')
    setAssistantProfile.mockRejectedValue(new ValidationError('bad hour'))
    const response = await PATCH(jsonRequest({ wakeHour: 99 }))
    expect(response.status).toBe(422)
  })
})
