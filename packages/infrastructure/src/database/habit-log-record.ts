import { HabitLog, asEntityId } from '@lifedeck/domain'

export type HabitLogRecord = {
  id: string
  habitId: string
  date: string
  createdAt: Date
}

export function toDomainHabitLog(record: HabitLogRecord): HabitLog {
  return HabitLog.restore({
    id: asEntityId(record.id),
    habitId: asEntityId(record.habitId),
    date: record.date,
    createdAt: record.createdAt,
  })
}

export function toHabitLogRecord(log: HabitLog): HabitLogRecord {
  const props = log.toJSON()
  return {
    id: props.id,
    habitId: props.habitId,
    date: props.date,
    createdAt: props.createdAt,
  }
}
