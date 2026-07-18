import type { JobScheduler } from '@lifedeck/application'

type FetchLike = (
  input: string,
  init: {
    method: string
    headers: Record<string, string>
    body: string
  },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>

export interface QStashJobSchedulerDeps {
  /**
   * QStash REST endpoint for the token's region (from QSTASH_URL). QStash is
   * multi-region: the default `qstash.upstash.io` is EU, and a US token needs
   * `qstash-us-east-1.upstash.io`. Hitting the wrong region 404s.
   */
  baseUrl: string
  /** QStash REST token (Bearer) that authorizes publishing. */
  token: string
  /** Absolute URL QStash should call when the wake fires (the dispatch route). */
  destinationUrl: string
  /** Value forwarded as the destination's `Authorization` header (the cron secret). */
  forwardAuthorization: string
  fetchFn: FetchLike
  /** Best-effort error sink; a failed publish must not break enqueue. */
  onError: (error: unknown) => void
}

/**
 * Schedules a wake by publishing a QStash message that fires at `at` and calls
 * the dispatch route. This makes due jobs run within seconds of their run time
 * instead of waiting for the periodic fallback cron, so the database (Neon)
 * only wakes when there is real work, not on a fixed poll.
 *
 * Publishing is best-effort: on any failure it reports via `onError` and
 * resolves, because the persisted job is the source of truth and the fallback
 * cron still drains it.
 */
export class QStashJobScheduler implements JobScheduler {
  constructor(private readonly deps: QStashJobSchedulerDeps) {}

  async scheduleWake(at: Date): Promise<void> {
    // QStash schedules an absolute delivery time via a Unix timestamp (seconds).
    // A past timestamp simply delivers as soon as possible.
    const notBefore = Math.floor(at.getTime() / 1000)
    const base = this.deps.baseUrl.replace(/\/$/, '')
    const url = `${base}/v2/publish/${this.deps.destinationUrl}`
    try {
      const response = await this.deps.fetchFn(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.deps.token}`,
          'Content-Type': 'application/json',
          'Upstash-Not-Before': String(notBefore),
          // Forwarded to the dispatch route as its `Authorization` header so the
          // existing cron guard authorizes the QStash-triggered call.
          'Upstash-Forward-Authorization': this.deps.forwardAuthorization,
        },
        body: '{}',
      })
      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        this.deps.onError(
          new Error(
            `QStash publish to ${url} failed with status ${response.status}: ${detail.slice(0, 300)}`,
          ),
        )
      }
    } catch (error) {
      this.deps.onError(error)
    }
  }
}
