import { describe, expect, it } from 'vitest'
import {
  toDomainRecurringTask,
  toRecurringTaskRecord,
  type RecurringTaskRecord,
} from '@/database/recurring-task-record'

const RECORD: RecurringTaskRecord = {
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  ownerId: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  title: 'Drink water',
  rule: {
    freq: 'weekly',
    interval: 1,
    byWeekday: [1, 3, 5],
    startDate: '2026-06-21',
    until: '2026-12-31',
  },
  createdAt: new Date('2026-06-21T10:00:00.000Z'),
}

describe('recurring-task-record mapping', () => {
  it('round-trips a record through the domain entity', () => {
    const task = toDomainRecurringTask(RECORD)
    expect(toRecurringTaskRecord(task)).toEqual(RECORD)
  })
})
