import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'

export const SCHEDULED_JOB_STATUSES = ['pending', 'done', 'failed'] as const

export type ScheduledJobStatus = (typeof SCHEDULED_JOB_STATUSES)[number]

export type ScheduledJobProps = {
  id: EntityId
  type: string
  payload: Record<string, unknown>
  runAt: Date
  status: ScheduledJobStatus
  attempts: number
  lastError: string | null
  // Set by the enqueuer when the same job must never run twice, such as one
  // digest per user per local day. Unique across the table.
  dedupKey: string | null
  createdAt: Date
}

export class ScheduledJob {
  private constructor(private props: ScheduledJobProps) {}

  static create(input: {
    id: EntityId
    type: string
    payload: Record<string, unknown>
    runAt: Date
    createdAt: Date
    dedupKey?: string | null
  }): ScheduledJob {
    return new ScheduledJob({
      id: input.id,
      type: guard.notEmpty(input.type, 'Scheduled job type'),
      payload: input.payload,
      runAt: input.runAt,
      status: 'pending',
      attempts: 0,
      lastError: null,
      dedupKey: input.dedupKey ?? null,
      createdAt: input.createdAt,
    })
  }

  static restore(props: ScheduledJobProps): ScheduledJob {
    return new ScheduledJob({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get type(): string {
    return this.props.type
  }

  get payload(): Record<string, unknown> {
    return this.props.payload
  }

  get runAt(): Date {
    return this.props.runAt
  }

  get status(): ScheduledJobStatus {
    return this.props.status
  }

  get attempts(): number {
    return this.props.attempts
  }

  get dedupKey(): string | null {
    return this.props.dedupKey
  }

  lease(until: Date): void {
    this.props.runAt = until
  }

  markDone(): void {
    this.props.status = 'done'
  }

  markFailed(error: string, retryAt: Date | null): void {
    this.props.attempts += 1
    this.props.lastError = error
    if (retryAt) {
      this.props.status = 'pending'
      this.props.runAt = retryAt
    } else {
      this.props.status = 'failed'
    }
  }

  toJSON(): ScheduledJobProps {
    return { ...this.props }
  }
}
