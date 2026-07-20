// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const dispatchDueJobs = vi.fn()
const runScheduledFanOut = vi.fn()
const warmDb = vi.fn()

vi.mock('@/server/container', () => ({
  getContainer: () => ({ dispatchDueJobs, runScheduledFanOut }),
}))

vi.mock('@/server/db/warm-db', () => ({
  warmDb: () => warmDb(),
}))

import { POST as dispatchPost, GET as dispatchGet } from './dispatch-jobs/route'
import { POST as fanOutPost, GET as fanOutGet } from './fan-out-jobs/route'

const SECRET = 'cron-secret'

function cronRequest(authorized: boolean): Request {
  return new Request('https://app.test/api/v1/internal/dispatch-jobs', {
    method: 'POST',
    headers: authorized ? { authorization: `Bearer ${SECRET}` } : {},
  })
}

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', SECRET)
  dispatchDueJobs.mockResolvedValue({ dispatched: 3 })
  runScheduledFanOut.mockResolvedValue({ enqueued: 5 })
  warmDb.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('internal cron routes', () => {
  it('dispatches due jobs after warming the db when authorized', async () => {
    const response = await dispatchPost(cronRequest(true))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: { dispatched: 3 } })
    expect(warmDb).toHaveBeenCalledOnce()
    expect(dispatchDueJobs).toHaveBeenCalledOnce()
  })

  it('rejects an unauthenticated dispatch call with 401', async () => {
    const response = await dispatchPost(cronRequest(false))
    expect(response.status).toBe(401)
    expect(dispatchDueJobs).not.toHaveBeenCalled()
    expect(warmDb).not.toHaveBeenCalled()
  })

  it('surfaces a dispatch failure as a 500', async () => {
    dispatchDueJobs.mockRejectedValue(new Error('db down'))
    const response = await dispatchPost(cronRequest(true))
    expect(response.status).toBe(500)
  })

  it('runs the scheduled fan-out when authorized', async () => {
    const response = await fanOutPost(cronRequest(true))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: { enqueued: 5 } })
    expect(warmDb).toHaveBeenCalledOnce()
    expect(runScheduledFanOut).toHaveBeenCalledOnce()
  })

  it('rejects an unauthenticated fan-out call with 401', async () => {
    const response = await fanOutPost(cronRequest(false))
    expect(response.status).toBe(401)
    expect(runScheduledFanOut).not.toHaveBeenCalled()
  })

  it('surfaces a fan-out failure as a 500', async () => {
    runScheduledFanOut.mockRejectedValue(new Error('sweep failed'))
    const response = await fanOutPost(cronRequest(true))
    expect(response.status).toBe(500)
  })

  it('reuses the same guarded handler for GET (Vercel Cron)', () => {
    expect(dispatchGet).toBe(dispatchPost)
    expect(fanOutGet).toBe(fanOutPost)
  })
})
