import { beforeEach, describe, expect, it } from 'vitest'
import { Subtask, areAllSubtasksCompleted } from '@/entities/subtask'
import { asEntityId } from '@/shared/id'
import { ValidationError } from '@/shared/domain-error'

const SUBTASK_ID = asEntityId('3f2504e0-4f89-41d3-9a0c-0305e82c3301')
const TASK_ID = asEntityId('1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed')
const NOW = new Date('2026-06-21T10:00:00.000Z')

function makeSubtask(title = 'Pick a color', position = 0) {
  return Subtask.create({
    id: SUBTASK_ID,
    taskId: TASK_ID,
    title,
    position,
    createdAt: NOW,
  })
}

describe('Subtask.create', () => {
  it('starts pending with no completion timestamp', () => {
    const subtask = makeSubtask()
    expect(subtask.status).toBe('pending')
    expect(subtask.isCompleted).toBe(false)
    expect(subtask.toJSON()).toMatchObject({
      taskId: TASK_ID,
      position: 0,
      completedAt: null,
    })
  })

  it('trims the title', () => {
    expect(makeSubtask('  Wrap it  ').toJSON().title).toBe('Wrap it')
  })

  it('defaults the position to zero', () => {
    const subtask = Subtask.create({
      id: SUBTASK_ID,
      taskId: TASK_ID,
      title: 'Buy it',
      createdAt: NOW,
    })
    expect(subtask.position).toBe(0)
  })

  it('rejects an empty title', () => {
    expect(() => makeSubtask('   ')).toThrow(ValidationError)
  })

  it('rejects a title longer than the limit', () => {
    expect(() => makeSubtask('x'.repeat(281))).toThrow(ValidationError)
  })
})

describe('Subtask behavior', () => {
  let subtask: Subtask

  beforeEach(() => {
    subtask = makeSubtask()
  })

  it('completes once and records the timestamp', () => {
    subtask.complete(NOW)
    expect(subtask.isCompleted).toBe(true)
    expect(subtask.toJSON().completedAt).toEqual(NOW)
  })

  it('keeps the first completion timestamp when completed again', () => {
    const later = new Date('2026-06-22T10:00:00.000Z')
    subtask.complete(NOW)
    subtask.complete(later)
    expect(subtask.toJSON().completedAt).toEqual(NOW)
  })

  it('reopens back to pending and clears the timestamp', () => {
    subtask.complete(NOW)
    subtask.reopen()
    expect(subtask.status).toBe('pending')
    expect(subtask.toJSON().completedAt).toBeNull()
  })

  it('updates its position', () => {
    subtask.setPosition(4)
    expect(subtask.position).toBe(4)
  })

  it('renames with a trimmed title', () => {
    subtask.rename('  Renamed  ')
    expect(subtask.toJSON().title).toBe('Renamed')
  })

  it('rejects an empty rename', () => {
    expect(() => subtask.rename('   ')).toThrow(ValidationError)
  })

  it('restores from props', () => {
    const restored = Subtask.restore(subtask.toJSON())
    expect(restored.toJSON()).toEqual(subtask.toJSON())
  })
})

describe('areAllSubtasksCompleted', () => {
  it('is false for an empty list', () => {
    expect(areAllSubtasksCompleted([])).toBe(false)
  })

  it('is false when at least one is pending', () => {
    const done = makeSubtask('done')
    done.complete(NOW)
    const pending = makeSubtask('pending')
    expect(areAllSubtasksCompleted([done, pending])).toBe(false)
  })

  it('is true when every subtask is completed', () => {
    const a = makeSubtask('a')
    a.complete(NOW)
    const b = makeSubtask('b')
    b.complete(NOW)
    expect(areAllSubtasksCompleted([a, b])).toBe(true)
  })
})
