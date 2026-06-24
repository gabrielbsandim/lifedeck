import {
  ScheduledJob,
  asEntityId,
  type ScheduledJobStatus,
} from '@lifedeck/domain'

export type ScheduledJobRecord = {
  id: string
  type: string
  payload: Record<string, unknown>
  runAt: Date
  status: ScheduledJobStatus
  attempts: number
  lastError: string | null
  createdAt: Date
}

export function toDomainScheduledJob(record: ScheduledJobRecord): ScheduledJob {
  return ScheduledJob.restore({
    id: asEntityId(record.id),
    type: record.type,
    payload: record.payload,
    runAt: record.runAt,
    status: record.status,
    attempts: record.attempts,
    lastError: record.lastError,
    createdAt: record.createdAt,
  })
}

export function toScheduledJobRecord(job: ScheduledJob): ScheduledJobRecord {
  const props = job.toJSON()
  return {
    id: props.id,
    type: props.type,
    payload: props.payload,
    runAt: props.runAt,
    status: props.status,
    attempts: props.attempts,
    lastError: props.lastError,
    createdAt: props.createdAt,
  }
}
