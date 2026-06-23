import { beforeEach, describe, expect, it } from 'vitest'
import { Task } from '@/entities/task'
import { asEntityId } from '@/shared/id'
import { ValidationError } from '@/shared/domain-error'

const TASK_ID = asEntityId('3f2504e0-4f89-41d3-9a0c-0305e82c3301')
const LIST_ID = asEntityId('1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed')
const MEMBER_ID = asEntityId('9c858901-8a57-4791-81fe-4c455b099bc9')
const NOW = new Date('2026-06-21T10:00:00.000Z')

function makeTask(title = 'Buy flowers') {
  return Task.create({ id: TASK_ID, listId: LIST_ID, title, createdAt: NOW })
}

describe('Task.create', () => {
  it('starts pending with no observation or assignee', () => {
    const task = makeTask()
    expect(task.status).toBe('pending')
    expect(task.isCompleted).toBe(false)
    expect(task.toJSON()).toMatchObject({
      observation: null,
      assigneeId: null,
      recurringTaskId: null,
      completedAt: null,
    })
  })

  it('trims the title', () => {
    expect(makeTask('  Walk the dog ').toJSON().title).toBe('Walk the dog')
  })

  it('links to a recurring task definition when provided', () => {
    const task = Task.create({
      id: TASK_ID,
      listId: LIST_ID,
      title: 'Drink water',
      createdAt: NOW,
      recurringTaskId: MEMBER_ID,
    })
    expect(task.toJSON().recurringTaskId).toBe(MEMBER_ID)
  })

  it('rejects an empty title', () => {
    expect(() => makeTask('   ')).toThrow(ValidationError)
  })

  it('rejects a title longer than the limit', () => {
    expect(() => makeTask('x'.repeat(281))).toThrow(ValidationError)
  })
})

describe('Task behavior', () => {
  let task: Task

  beforeEach(() => {
    task = makeTask()
  })

  it('completes once and records the timestamp', () => {
    task.complete(NOW)
    expect(task.isCompleted).toBe(true)
    expect(task.toJSON().completedAt).toEqual(NOW)
  })

  it('is idempotent when completing twice', () => {
    task.complete(NOW)
    const later = new Date('2026-06-22T10:00:00.000Z')
    task.complete(later)
    expect(task.toJSON().completedAt).toEqual(NOW)
  })

  it('reopens a completed task', () => {
    task.complete(NOW)
    task.reopen()
    expect(task.status).toBe('pending')
    expect(task.toJSON().completedAt).toBeNull()
  })

  it('renames with validation', () => {
    task.rename('New title')
    expect(task.toJSON().title).toBe('New title')
    expect(() => task.rename('')).toThrow(ValidationError)
  })

  it('sets and clears an observation', () => {
    task.setObservation('Pick red roses')
    expect(task.toJSON().observation).toBe('Pick red roses')
    task.setObservation(null)
    expect(task.toJSON().observation).toBeNull()
  })

  it('rejects an observation that is too long', () => {
    expect(() => task.setObservation('x'.repeat(2001))).toThrow(ValidationError)
  })

  it('assigns and unassigns a member', () => {
    task.assignTo(MEMBER_ID)
    expect(task.toJSON().assigneeId).toBe(MEMBER_ID)
    task.assignTo(null)
    expect(task.toJSON().assigneeId).toBeNull()
  })

  it('toggles privacy', () => {
    expect(task.isPrivate).toBe(false)
    task.setPrivacy(true)
    expect(task.isPrivate).toBe(true)
    task.setPrivacy(false)
    expect(task.isPrivate).toBe(false)
  })
})

describe('Task.restore', () => {
  it('rebuilds a task from persisted props', () => {
    const restored = Task.restore({
      id: TASK_ID,
      listId: LIST_ID,
      title: 'Restored',
      status: 'completed',
      observation: 'note',
      assigneeId: MEMBER_ID,
      recurringTaskId: null,
      isPrivate: true,
      position: 3,
      carriedFromDate: null,
      carriedForwardAt: null,
      createdAt: NOW,
      completedAt: NOW,
    })
    expect(restored.isCompleted).toBe(true)
    expect(restored.position).toBe(3)
  })

  it('moves to another list at a new position', () => {
    const restored = Task.restore({
      id: TASK_ID,
      listId: LIST_ID,
      title: 'Carry me',
      status: 'pending',
      observation: null,
      assigneeId: null,
      recurringTaskId: null,
      isPrivate: false,
      position: 0,
      carriedFromDate: null,
      carriedForwardAt: null,
      createdAt: NOW,
      completedAt: null,
    })
    restored.moveTo(MEMBER_ID, 5)
    expect(restored.listId).toBe(MEMBER_ID)
    expect(restored.position).toBe(5)
    expect(restored.toJSON().title).toBe('Carry me')
  })
})

describe('Task carry-forward', () => {
  it('creates a carried copy with an observation and origin date', () => {
    const from = new Date('2026-06-21T00:00:00.000Z')
    const copy = Task.create({
      id: TASK_ID,
      listId: LIST_ID,
      title: 'Buy flowers',
      observation: 'White roses',
      carriedFromDate: from,
      createdAt: NOW,
    })
    expect(copy.toJSON().observation).toBe('White roses')
    expect(copy.carriedFromDate).toEqual(from)
    expect(copy.isCarriedForward).toBe(false)
  })

  it('marks the source as carried forward once', () => {
    const task = Task.create({
      id: TASK_ID,
      listId: LIST_ID,
      title: 'Buy flowers',
      createdAt: NOW,
    })
    task.markCarriedForward(NOW)
    expect(task.isCarriedForward).toBe(true)
    expect(task.toJSON().carriedForwardAt).toEqual(NOW)

    task.markCarriedForward(new Date('2026-06-23T00:00:00.000Z'))
    expect(task.toJSON().carriedForwardAt).toEqual(NOW)
  })
})
