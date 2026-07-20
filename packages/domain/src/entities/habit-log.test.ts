import { describe, expect, it } from 'vitest'
import { HabitLog } from '@/entities/habit-log'
import { asEntityId } from '@/shared/id'
import { ValidationError } from '@/shared/domain-error'

const ID = asEntityId('3f2504e0-4f89-41d3-9a0c-0305e82c3301')
const HABIT = asEntityId('a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f')
const CREATED_AT = new Date('2026-07-20T10:00:00.000Z')

function create(date = '2026-07-20'): HabitLog {
  return HabitLog.create({
    id: ID,
    habitId: HABIT,
    date,
    createdAt: CREATED_AT,
  })
}

describe('HabitLog', () => {
  it('creates a completion mark for a civil date', () => {
    const log = create()
    expect(log.id).toBe(ID)
    expect(log.habitId).toBe(HABIT)
    expect(log.date).toBe('2026-07-20')
    expect(log.toJSON().createdAt).toEqual(CREATED_AT)
  })

  it('rejects a malformed date', () => {
    expect(() => create('20-07-2026')).toThrow(ValidationError)
  })

  it('restores from persisted props', () => {
    const props = create().toJSON()
    expect(HabitLog.restore(props).toJSON()).toEqual(props)
  })
})
