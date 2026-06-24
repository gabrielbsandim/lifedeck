import type { ScheduledJob } from '@lifedeck/domain'

export interface ScheduledJobRepository {
  save(job: ScheduledJob): Promise<void>
  listDue(now: Date, limit: number): Promise<ScheduledJob[]>
}
