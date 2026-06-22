import { describe, expect, it } from 'vitest'
import {
  toDomainNotification,
  toNotificationRecord,
  type NotificationRecord,
} from '@/database/notification-record'

const RECORD: NotificationRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  type: 'task-assigned',
  data: { taskTitle: 'Book venue', listTitle: 'Wedding' },
  readAt: null,
  createdAt: new Date('2026-06-22T10:00:00.000Z'),
}

describe('notification record', () => {
  it('round-trips through the domain entity', () => {
    const domain = toDomainNotification(RECORD)
    expect(toNotificationRecord(domain)).toEqual(RECORD)
  })

  it('preserves a read timestamp', () => {
    const read: NotificationRecord = {
      ...RECORD,
      readAt: new Date('2026-06-22T11:00:00.000Z'),
    }
    const domain = toDomainNotification(read)
    expect(domain.isRead).toBe(true)
    expect(toNotificationRecord(domain).readAt).toEqual(read.readAt)
  })
})
