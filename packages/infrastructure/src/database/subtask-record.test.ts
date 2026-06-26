import { describe, expect, it } from 'vitest'
import {
  toDomainSubtask,
  toSubtaskRecord,
  type SubtaskRecord,
} from '@/database/subtask-record'

const RECORD: SubtaskRecord = {
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  taskId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
  title: 'Pick a color',
  status: 'completed',
  position: 2,
  createdAt: new Date('2026-06-21T10:00:00.000Z'),
  completedAt: new Date('2026-06-21T11:00:00.000Z'),
}

describe('subtask-record mapping', () => {
  it('round-trips a record through the domain entity', () => {
    const subtask = toDomainSubtask(RECORD)
    expect(toSubtaskRecord(subtask)).toEqual(RECORD)
  })

  it('round-trips a pending record with no completion timestamp', () => {
    const pending: SubtaskRecord = {
      ...RECORD,
      status: 'pending',
      completedAt: null,
    }
    const subtask = toDomainSubtask(pending)
    expect(toSubtaskRecord(subtask)).toEqual(pending)
  })
})
