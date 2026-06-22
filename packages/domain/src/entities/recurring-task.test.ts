import { describe, expect, it } from 'vitest'
import { RecurringTask } from '@/entities/recurring-task'
import { asEntityId } from '@/shared/id'
import { ValidationError } from '@/shared/domain-error'
import type { RecurrenceRule } from '@/value-objects/recurrence-rule'

const ID = asEntityId('3f2504e0-4f89-41d3-9a0c-0305e82c3301')
const OWNER = asEntityId('a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f')
const CREATED_AT = new Date('2026-06-21T10:00:00.000Z')
const RULE: RecurrenceRule = {
  freq: 'daily',
  interval: 1,
  startDate: '2026-06-21',
}

function create(
  title = 'Drink water',
  rule: RecurrenceRule = RULE,
): RecurringTask {
  return RecurringTask.create({
    id: ID,
    ownerId: OWNER,
    title,
    rule,
    createdAt: CREATED_AT,
  })
}

describe('RecurringTask', () => {
  it('creates a definition with a validated rule', () => {
    const task = create('  Drink water  ')

    expect(task.id).toBe(ID)
    expect(task.ownerId).toBe(OWNER)
    expect(task.title).toBe('Drink water')
    expect(task.rule).toEqual(RULE)
    expect(task.toJSON().createdAt).toEqual(CREATED_AT)
  })

  it('rejects an empty title', () => {
    expect(() => create('   ')).toThrow(ValidationError)
  })

  it('rejects an invalid rule', () => {
    expect(() => create('Drink water', { ...RULE, interval: 0 })).toThrow(
      ValidationError,
    )
  })

  it('checks ownership', () => {
    const task = create()
    expect(task.isOwnedBy(OWNER)).toBe(true)
    expect(task.isOwnedBy(ID)).toBe(false)
  })

  it('renames with validation', () => {
    const task = create()
    task.rename('  Stretch  ')
    expect(task.title).toBe('Stretch')
    expect(() => task.rename('')).toThrow(ValidationError)
  })

  it('changes the rule with validation', () => {
    const task = create()
    const next: RecurrenceRule = {
      freq: 'weekly',
      interval: 1,
      byWeekday: [1, 3],
      startDate: '2026-06-21',
    }
    task.changeRule(next)
    expect(task.rule).toEqual(next)
    expect(() => task.changeRule({ ...next, interval: 0 })).toThrow(
      ValidationError,
    )
  })

  it('restores from persisted props', () => {
    const props = create().toJSON()
    expect(RecurringTask.restore(props).toJSON()).toEqual(props)
  })
})
