import { describe, expect, it } from 'vitest'
import { Habit } from '@/entities/habit'
import { asEntityId } from '@/shared/id'
import { ValidationError } from '@/shared/domain-error'
import type { HabitCadence } from '@/value-objects/habit-cadence'

const ID = asEntityId('3f2504e0-4f89-41d3-9a0c-0305e82c3301')
const OWNER = asEntityId('a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f')
const CREATED_AT = new Date('2026-07-20T10:00:00.000Z')
const CADENCE: HabitCadence = { kind: 'daily' }

function create(overrides?: {
  title?: string
  cadence?: HabitCadence
  checkinHour?: number | null
}): Habit {
  return Habit.create({
    id: ID,
    ownerId: OWNER,
    title: overrides?.title ?? 'Meditate',
    cadence: overrides?.cadence ?? CADENCE,
    checkinHour: overrides?.checkinHour,
    createdAt: CREATED_AT,
  })
}

describe('Habit', () => {
  it('creates an active habit with a validated cadence', () => {
    const habit = create({ title: '  Meditate  ', checkinHour: 8 })

    expect(habit.id).toBe(ID)
    expect(habit.ownerId).toBe(OWNER)
    expect(habit.title).toBe('Meditate')
    expect(habit.cadence).toEqual(CADENCE)
    expect(habit.checkinHour).toBe(8)
    expect(habit.active).toBe(true)
    expect(habit.toJSON().createdAt).toEqual(CREATED_AT)
  })

  it('defaults the check-in hour to null', () => {
    expect(create().checkinHour).toBeNull()
  })

  it('rejects an empty title', () => {
    expect(() => create({ title: '   ' })).toThrow(ValidationError)
  })

  it('rejects an invalid cadence', () => {
    expect(() =>
      create({ cadence: { kind: 'weekdays', weekdays: [] } }),
    ).toThrow(ValidationError)
  })

  it('rejects a check-in hour out of range', () => {
    expect(() => create({ checkinHour: 24 })).toThrow(ValidationError)
  })

  it('checks ownership', () => {
    const habit = create()
    expect(habit.isOwnedBy(OWNER)).toBe(true)
    expect(habit.isOwnedBy(ID)).toBe(false)
  })

  it('renames with validation', () => {
    const habit = create()
    habit.rename('  Read  ')
    expect(habit.title).toBe('Read')
    expect(() => habit.rename('')).toThrow(ValidationError)
  })

  it('changes the cadence with validation', () => {
    const habit = create()
    const next: HabitCadence = { kind: 'times_per_week', count: 3 }
    habit.changeCadence(next)
    expect(habit.cadence).toEqual(next)
    expect(() =>
      habit.changeCadence({ kind: 'times_per_week', count: 0 }),
    ).toThrow(ValidationError)
  })

  it('sets and clears the check-in hour with validation', () => {
    const habit = create()
    habit.setCheckinHour(21)
    expect(habit.checkinHour).toBe(21)
    habit.setCheckinHour(null)
    expect(habit.checkinHour).toBeNull()
    expect(() => habit.setCheckinHour(-1)).toThrow(ValidationError)
  })

  it('toggles the active flag', () => {
    const habit = create()
    habit.setActive(false)
    expect(habit.active).toBe(false)
    habit.setActive(true)
    expect(habit.active).toBe(true)
  })

  it('restores from persisted props', () => {
    const props = create({ checkinHour: 8 }).toJSON()
    expect(Habit.restore(props).toJSON()).toEqual(props)
  })
})
