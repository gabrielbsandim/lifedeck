import type { ScheduledJob } from '@lifedeck/domain'

export interface ScheduledJobRepository {
  save(job: ScheduledJob): Promise<void>
  listDue(now: Date, limit: number): Promise<ScheduledJob[]>
  /**
   * Atomically pulls due jobs and leases them by pushing their run time to
   * `leaseUntil`, so a concurrent dispatcher cannot pick up the same job. A
   * crashed run lets the lease expire and the job becomes due again.
   */
  claimDue(now: Date, limit: number, leaseUntil: Date): Promise<ScheduledJob[]>
}
