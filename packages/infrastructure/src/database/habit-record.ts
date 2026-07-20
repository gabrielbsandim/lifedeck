import { Habit, asEntityId } from '@lifedeck/domain'
import type { HabitCadence } from '@lifedeck/domain'

export type HabitRecord = {
  id: string
  ownerId: string
  title: string
  cadence: HabitCadence
  checkinHour: number | null
  active: boolean
  createdAt: Date
}

export function toDomainHabit(record: HabitRecord): Habit {
  return Habit.restore({
    id: asEntityId(record.id),
    ownerId: asEntityId(record.ownerId),
    title: record.title,
    cadence: record.cadence,
    checkinHour: record.checkinHour,
    active: record.active,
    createdAt: record.createdAt,
  })
}

export function toHabitRecord(habit: Habit): HabitRecord {
  const props = habit.toJSON()
  return {
    id: props.id,
    ownerId: props.ownerId,
    title: props.title,
    cadence: props.cadence,
    checkinHour: props.checkinHour,
    active: props.active,
    createdAt: props.createdAt,
  }
}
