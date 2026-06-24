import { UsageEvent, asEntityId, type AiOperation } from '@lifedeck/domain'

export type UsageEventRecord = {
  id: string
  userId: string
  operation: AiOperation
  credits: number
  createdAt: Date
}

export function toDomainUsageEvent(record: UsageEventRecord): UsageEvent {
  return UsageEvent.restore({
    id: asEntityId(record.id),
    userId: asEntityId(record.userId),
    operation: record.operation,
    credits: record.credits,
    createdAt: record.createdAt,
  })
}

export function toUsageEventRecord(event: UsageEvent): UsageEventRecord {
  const props = event.toJSON()
  return {
    id: props.id,
    userId: props.userId,
    operation: props.operation,
    credits: props.credits,
    createdAt: props.createdAt,
  }
}
