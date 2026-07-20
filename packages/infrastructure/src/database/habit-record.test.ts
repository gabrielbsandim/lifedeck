import { describe, expect, it } from 'vitest'
import {
  toDomainHabit,
  toHabitRecord,
  type HabitRecord,
} from '@/database/habit-record'

const RECORD: HabitRecord = {
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  ownerId: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  title: 'Meditate',
  cadence: { kind: 'weekdays', weekdays: [1, 3, 5] },
  checkinHour: 8,
  active: true,
  createdAt: new Date('2026-07-20T10:00:00.000Z'),
}

describe('habit-record mapping', () => {
  it('round-trips a record through the domain entity', () => {
    const habit = toDomainHabit(RECORD)
    expect(toHabitRecord(habit)).toEqual(RECORD)
  })

  it('round-trips a habit with no check-in hour', () => {
    const record: HabitRecord = {
      ...RECORD,
      cadence: { kind: 'daily' },
      checkinHour: null,
      active: false,
    }
    expect(toHabitRecord(toDomainHabit(record))).toEqual(record)
  })
})
