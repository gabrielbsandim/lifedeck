import { describe, expect, it } from 'vitest'
import { UsageEvent, asEntityId } from '@lifedeck/domain'
import {
  toDomainUsageEvent,
  toUsageEventRecord,
  type UsageEventRecord,
} from '@/database/usage-event-record'

const RECORD: UsageEventRecord = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  userId: 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb',
  operation: 'assistantPro',
  credits: 6,
  createdAt: new Date('2026-06-24T10:00:00.000Z'),
}

describe('usage-event-record', () => {
  it('maps a record to a domain event', () => {
    const event = toDomainUsageEvent(RECORD)
    expect(event.operation).toBe('assistantPro')
    expect(event.credits).toBe(6)
  })

  it('maps a domain event back to a record', () => {
    const event = UsageEvent.restore({
      id: asEntityId(RECORD.id),
      userId: asEntityId(RECORD.userId),
      operation: RECORD.operation,
      credits: RECORD.credits,
      createdAt: RECORD.createdAt,
    })
    expect(toUsageEventRecord(event)).toEqual(RECORD)
  })
})
