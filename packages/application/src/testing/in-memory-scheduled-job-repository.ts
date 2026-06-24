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
}
