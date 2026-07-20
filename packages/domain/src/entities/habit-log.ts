import { ValidationError } from '@/shared/domain-error'
import type { EntityId } from '@/shared/id'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// A single completion mark: the habit was done on one civil date. The row's
// existence means "done"; there is no explicit not-done record, so an absent
// date reads as a miss when a streak is computed. Un-logging deletes the row.
export type HabitLogProps = {
  id: EntityId
  habitId: EntityId
  date: string
  createdAt: Date
}

function validateDate(date: string): string {
  if (!DATE_PATTERN.test(date)) {
    throw new ValidationError('Habit log date must be a YYYY-MM-DD string.')
  }
  return date
}

export class HabitLog {
  private constructor(private props: HabitLogProps) {}

  static create(input: {
    id: EntityId
    habitId: EntityId
    date: string
    createdAt: Date
  }): HabitLog {
    return new HabitLog({
      id: input.id,
      habitId: input.habitId,
      date: validateDate(input.date),
      createdAt: input.createdAt,
    })
  }

  static restore(props: HabitLogProps): HabitLog {
    return new HabitLog({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get habitId(): EntityId {
    return this.props.habitId
  }

  get date(): string {
    return this.props.date
  }

  toJSON(): HabitLogProps {
    return { ...this.props }
  }
}
