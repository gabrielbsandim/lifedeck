import type { ScheduledJob } from '@lifedeck/domain'
import type { ScheduledJobRepository } from '@/ports/scheduled-job-repository'

export class InMemoryScheduledJobRepository implements ScheduledJobRepository {
  private readonly items = new Map<string, ScheduledJob>()

  async save(job: ScheduledJob): Promise<void> {
    this.items.set(job.id as string, job)
  }

  async listDue(now: Date, limit: number): Promise<ScheduledJob[]> {
    return [...this.items.values()]
      .filter(job => job.status === 'pending' && job.runAt <= now)
      .sort((a, b) => a.runAt.getTime() - b.runAt.getTime())
      .slice(0, limit)
  }

  async claimDue(
    now: Date,
    limit: number,
    leaseUntil: Date,
  ): Promise<ScheduledJob[]> {
    const claimed = await this.listDue(now, limit)
    for (const job of claimed) {
      job.lease(leaseUntil)
      await this.save(job)
    }
    return claimed
  }
}
