import { RecurringTask, asEntityId } from '@lifedeck/domain'
import type { RecurrenceRule } from '@lifedeck/domain'

export type RecurringTaskRecord = {
  id: string
  ownerId: string
  title: string
  rule: RecurrenceRule
  createdAt: Date
}

export function toDomainRecurringTask(
  record: RecurringTaskRecord,
): RecurringTask {
  return RecurringTask.restore({
    id: asEntityId(record.id),
    ownerId: asEntityId(record.ownerId),
    title: record.title,
    rule: record.rule,
    createdAt: record.createdAt,
  })
}

export function toRecurringTaskRecord(
  task: RecurringTask,
): RecurringTaskRecord {
  const props = task.toJSON()
  return {
    id: props.id,
    ownerId: props.ownerId,
    title: props.title,
    rule: props.rule,
    createdAt: props.createdAt,
  }
}
