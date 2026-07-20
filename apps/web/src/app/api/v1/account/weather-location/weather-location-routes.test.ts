// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const setWeatherLocation = vi.fn()
const previewWeatherLocation = vi.fn()
const getUserIdFromRequest = vi.fn()

vi.mock('@/server/container', () => ({
  getContainer: () => ({ setWeatherLocation, previewWeatherLocation }),
}))

vi.mock('@/server/session/session', () => ({
  getUserIdFromRequest: (request: Request) => getUserIdFromRequest(request),
}))

import { PATCH } from './route'
import { POST as previewPost } from './preview/route'

function jsonRequest(body: unknown): Request {
  return new Request('https://app.test/api/v1/account/weather-location', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  getUserIdFromRequest.mockResolvedValue('user-1')
  setWeatherLocation.mockResolvedValue({ id: 'user-1', weatherLocation: 'Rio' })
  previewWeatherLocation.mockResolvedValue({ resolved: 'Rio de Janeiro' })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('weather-location routes', () => {
  it('saves the location for the authenticated user', async () => {
    const response = await PATCH(jsonRequest({ location: 'Rio' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: { id: 'user-1', weatherLocation: 'Rio' },
    })
    expect(setWeatherLocation).toHaveBeenCalledWith('user-1', {
      location: 'Rio',
    })
  })

  it('rejects an unauthenticated save with 401', async () => {
    getUserIdFromRequest.mockResolvedValue(null)
    const response = await PATCH(jsonRequest({ location: 'Rio' }))
    expect(response.status).toBe(401)
    expect(setWeatherLocation).not.toHaveBeenCalled()
  })

  it('previews a location before it is saved', async () => {
    const response = await previewPost(jsonRequest({ location: 'Rio' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: { resolved: 'Rio de Janeiro' },
    })
    expect(previewWeatherLocation).toHaveBeenCalledWith({ location: 'Rio' })
  })

  it('rejects an unauthenticated preview with 401', async () => {
    getUserIdFromRequest.mockResolvedValue(null)
    const response = await previewPost(jsonRequest({ location: 'Rio' }))
    expect(response.status).toBe(401)
    expect(previewWeatherLocation).not.toHaveBeenCalled()
  })

  it('maps a validation failure to the shared error handler', async () => {
    const { ValidationError } = await import('@lifedeck/domain')
    setWeatherLocation.mockRejectedValue(new ValidationError('too long'))
    const response = await PATCH(jsonRequest({ location: 'x' }))
    expect(response.status).toBe(422)
  })

  it('surfaces a preview failure as a 500', async () => {
    previewWeatherLocation.mockRejectedValue(new Error('geocode down'))
    const response = await previewPost(jsonRequest({ location: 'Rio' }))
    expect(response.status).toBe(500)
  })
})
