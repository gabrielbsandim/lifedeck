import { describe, expect, it } from 'vitest'
import { Notification } from '@/entities/notification'
import { asEntityId } from '@/shared/id'
import { ValidationError } from '@/shared/domain-error'

const ID = asEntityId('11111111-1111-4111-8111-111111111111')
const USER = asEntityId('22222222-2222-4222-8222-222222222222')
const NOW = new Date('2026-06-22T10:00:00.000Z')

describe('Notification', () => {
  it('creates an unread notification', () => {
    const notification = Notification.create({
      id: ID,
      userId: USER,
      type: 'task-assigned',
      data: { taskTitle: 'Book venue', listTitle: 'Wedding' },
      createdAt: NOW,
    })
    expect(notification.isRead).toBe(false)
    expect(notification.toJSON().data.taskTitle).toBe('Book venue')
  })

  it('restores from persisted props and exposes ids', () => {
    const readAt = new Date('2026-06-22T11:00:00.000Z')
    const notification = Notification.restore({
      id: ID,
      userId: USER,
      type: 'task-assigned',
      data: { taskTitle: 'Book venue' },
      readAt,
      createdAt: NOW,
    })
    expect(notification.id).toBe(ID)
    expect(notification.userId).toBe(USER)
    expect(notification.isRead).toBe(true)
  })

  it('rejects an empty type', () => {
    expect(() =>
      Notification.create({
        id: ID,
        userId: USER,
        type: '',
        data: {},
        createdAt: NOW,
      }),
    ).toThrow(ValidationError)
  })

  it('marks as read once', () => {
    const notification = Notification.create({
      id: ID,
      userId: USER,
      type: 'task-assigned',
      data: {},
      createdAt: NOW,
    })
    const readAt = new Date('2026-06-22T11:00:00.000Z')
    notification.markRead(readAt)
    expect(notification.isRead).toBe(true)
    expect(notification.toJSON().readAt).toEqual(readAt)

    notification.markRead(new Date('2026-06-22T12:00:00.000Z'))
    expect(notification.toJSON().readAt).toEqual(readAt)
  })
})
