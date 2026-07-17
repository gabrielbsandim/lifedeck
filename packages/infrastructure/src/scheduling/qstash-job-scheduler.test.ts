import { describe, expect, it, vi } from 'vitest'
import { QStashJobScheduler } from '@/scheduling/qstash-job-scheduler'

const AT = new Date('2026-06-24T09:00:00.000Z')
// AT in Unix seconds (UTC), what QStash expects in Upstash-Not-Before.
const AT_UNIX = String(Math.floor(AT.getTime() / 1000))

function makeScheduler(overrides: {
  fetchFn: ReturnType<typeof vi.fn>
  onError?: ReturnType<typeof vi.fn>
}) {
  return new QStashJobScheduler({
    token: 'qstash-token',
    destinationUrl: 'https://app.lifedeck.test/api/v1/internal/dispatch-jobs',
    forwardAuthorization: 'Bearer cron-secret',
    fetchFn: overrides.fetchFn,
    onError: overrides.onError ?? vi.fn(),
  })
}

describe('QStashJobScheduler', () => {
  it('publishes a wake to the dispatch route at the absolute run time', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    const scheduler = makeScheduler({ fetchFn })

    await scheduler.scheduleWake(AT)

    expect(fetchFn).toHaveBeenCalledTimes(1)
    const [url, init] = fetchFn.mock.calls[0]!
    expect(url).toBe(
      'https://qstash.upstash.io/v2/publish/https://app.lifedeck.test/api/v1/internal/dispatch-jobs',
    )
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{}')
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer qstash-token',
      'Content-Type': 'application/json',
      'Upstash-Not-Before': AT_UNIX,
      'Upstash-Forward-Authorization': 'Bearer cron-secret',
    })
  })

  it('reports but does not throw when QStash returns a non-ok status', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 429 })
    const onError = vi.fn()
    const scheduler = makeScheduler({ fetchFn, onError })

    await expect(scheduler.scheduleWake(AT)).resolves.toBeUndefined()
    expect(onError).toHaveBeenCalledTimes(1)
    const reported = onError.mock.calls[0]![0]
    expect(reported).toBeInstanceOf(Error)
    expect((reported as Error).message).toContain('429')
  })

  it('reports but does not throw when the request itself fails', async () => {
    const failure = new Error('network down')
    const fetchFn = vi.fn().mockRejectedValue(failure)
    const onError = vi.fn()
    const scheduler = makeScheduler({ fetchFn, onError })

    await expect(scheduler.scheduleWake(AT)).resolves.toBeUndefined()
    expect(onError).toHaveBeenCalledWith(failure)
  })
})
