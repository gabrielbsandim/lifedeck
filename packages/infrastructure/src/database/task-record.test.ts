import { describe, expect, it } from 'vitest'
import {
  toDomainTask,
  toTaskRecord,
  type TaskRecord,
} from '@/database/task-record'

const RECORD: TaskRecord = {
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  listId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
  title: 'Buy flowers',
  status: 'completed',
  observation: 'Red roses',
  assigneeId: '9c858901-8a57-4791-81fe-4c455b099bc9',
  recurringTaskId: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  isPrivate: true,
  position: 2,
  createdAt: new Date('2026-06-21T10:00:00.000Z'),
  completedAt: new Date('2026-06-21T12:00:00.000Z'),
}

describe('task-record mapping', () => {
  it('round-trips a record through the domain entity', () => {
    const task = toDomainTask(RECORD)
    expect(toTaskRecord(task)).toEqual(RECORD)
  })

  it('maps null optional fields', () => {
    const task = toDomainTask({
      ...RECORD,
      assigneeId: null,
      observation: null,
      recurringTaskId: null,
    })
    const record = toTaskRecord(task)
    expect(record.assigneeId).toBeNull()
    expect(record.observation).toBeNull()
    expect(record.recurringTaskId).toBeNull()
  })
})
