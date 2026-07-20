import { ValidationError } from '@/shared/domain-error'
import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'
import {
  validateHabitCadence,
  type HabitCadence,
} from '@/value-objects/habit-cadence'

const MAX_TITLE_LENGTH = 120

// The local hour (0-23) at which a proactive check-in fires; null means the
// habit is tracked but never nudges. Mirrors assistantProfile.briefHour.
function validateCheckinHour(hour: number | null): number | null {
  if (hour === null) {
    return null
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new ValidationError('Habit check-in hour must be between 0 and 23.')
  }
  return hour
}

export type HabitProps = {
  id: EntityId
  ownerId: EntityId
  title: string
  cadence: HabitCadence
  checkinHour: number | null
  active: boolean
  createdAt: Date
}

export class Habit {
  private constructor(private props: HabitProps) {}

  static create(input: {
    id: EntityId
    ownerId: EntityId
    title: string
    cadence: HabitCadence
    checkinHour?: number | null
    createdAt: Date
  }): Habit {
    return new Habit({
      id: input.id,
      ownerId: input.ownerId,
      title: guard.maxLength(
        guard.notEmpty(input.title, 'Habit title'),
        MAX_TITLE_LENGTH,
        'Habit title',
      ),
      cadence: validateHabitCadence(input.cadence),
      checkinHour: validateCheckinHour(input.checkinHour ?? null),
      active: true,
      createdAt: input.createdAt,
    })
  }

  static restore(props: HabitProps): Habit {
    return new Habit({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get ownerId(): EntityId {
    return this.props.ownerId
  }

  get title(): string {
    return this.props.title
  }

  get cadence(): HabitCadence {
    return this.props.cadence
  }

  get checkinHour(): number | null {
    return this.props.checkinHour
  }

  get active(): boolean {
    return this.props.active
  }

  isOwnedBy(userId: EntityId): boolean {
    return this.props.ownerId === userId
  }

  rename(title: string): void {
    this.props.title = guard.maxLength(
      guard.notEmpty(title, 'Habit title'),
      MAX_TITLE_LENGTH,
      'Habit title',
    )
  }

  changeCadence(cadence: HabitCadence): void {
    this.props.cadence = validateHabitCadence(cadence)
  }

  setCheckinHour(hour: number | null): void {
    this.props.checkinHour = validateCheckinHour(hour)
  }

  setActive(active: boolean): void {
    this.props.active = active
  }

  toJSON(): HabitProps {
    return { ...this.props }
  }
}
