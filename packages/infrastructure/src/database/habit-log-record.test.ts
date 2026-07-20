import { describe, expect, it } from 'vitest'
import {
  toDomainHabitLog,
  toHabitLogRecord,
  type HabitLogRecord,
} from '@/database/habit-log-record'

const RECORD: HabitLogRecord = {
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  habitId: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  date: '2026-07-20',
  createdAt: new Date('2026-07-20T10:00:00.000Z'),
}

describe('habit-log-record mapping', () => {
  it('round-trips a record through the domain entity', () => {
    const log = toDomainHabitLog(RECORD)
    expect(toHabitLogRecord(log)).toEqual(RECORD)
  })
})
