import { ScheduledJob } from '@lifedeck/domain'
import type {
  Clock,
  EnqueueJobInput,
  IdGenerator,
  JobQueue,
  ScheduledJobRepository,
} from '@lifedeck/application'

export class OutboxJobQueue implements JobQueue {
  constructor(
    private readonly scheduledJobs: ScheduledJobRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
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
  }
}
