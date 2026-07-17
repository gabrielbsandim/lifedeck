import { ScheduledJob } from '@lifedeck/domain'
import type {
  Clock,
  EnqueueJobInput,
  IdGenerator,
  JobQueue,
  JobScheduler,
  ScheduledJobRepository,
} from '@lifedeck/application'

export class OutboxJobQueue implements JobQueue {
  constructor(
    private readonly scheduledJobs: ScheduledJobRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly scheduler: JobScheduler,
  ) {}

  async enqueue(input: EnqueueJobInput): Promise<void> {
    const job = ScheduledJob.create({
      id: this.ids.generate(),
      type: input.type,
      payload: input.payload,
      runAt: input.runAt,
      createdAt: this.clock.now(),
    })
    await this.scheduledJobs.save(job)
    // Persist first (the outbox), then request an on-time wake. The scheduler is
    // best-effort: if it fails, the fallback cron still drains the saved job.
    await this.scheduler.scheduleWake(input.runAt)
  }
}
