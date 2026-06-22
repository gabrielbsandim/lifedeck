import { describe, expect, it } from 'vitest'
import { Notification, asEntityId } from '@taskin/domain'
import { makeListNotifications } from '@/use-cases/list-notifications'
import {
  makeMarkAllNotificationsRead,
  makeMarkNotificationRead,
} from '@/use-cases/mark-notifications-read'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryNotificationRepository } from '@/testing/in-memory-notification-repository'
import { FixedClock, ID } from '@/testing/fakes'

const NOW = new Date('2026-06-22T10:00:00.000Z')
const N1 = asEntityId('11111111-1111-4111-8111-111111111111')
const N2 = asEntityId('22222222-2222-4222-8222-222222222222')

function notification(id: typeof N1, userId = ID.user, createdAt = NOW) {
  return Notification.create({
    id,
    userId,
    type: 'task-assigned',
    data: { taskTitle: 'Book venue', listTitle: 'Wedding' },
    createdAt,
  })
}

function setup() {
  const notifications = new InMemoryNotificationRepository()
  const clock = new FixedClock(NOW)
  return {
    notifications,
    listNotifications: makeListNotifications({ notifications }),
    markNotificationRead: makeMarkNotificationRead({ notifications, clock }),
    markAllNotificationsRead: makeMarkAllNotificationsRead({
      notifications,
      clock,
    }),
  }
}

describe('notifications use cases', () => {
  it('lists newest first with the unread count', async () => {
    const ctx = setup()
    await ctx.notifications.save(notification(N1, ID.user, NOW))
    await ctx.notifications.save(
      notification(N2, ID.user, new Date('2026-06-22T11:00:00.000Z')),
    )

    const view = await ctx.listNotifications(ID.user as string)

    expect(view.unread).toBe(2)
    expect(view.items.map(item => item.id)).toEqual([N2, N1])
  })

  it('marks a single notification read', async () => {
    const ctx = setup()
    await ctx.notifications.save(notification(N1))

    await ctx.markNotificationRead(ID.user as string, N1 as string)

    expect(await ctx.notifications.countUnread(ID.user)).toBe(0)
  })

  it('rejects marking a notification owned by someone else', async () => {
    const ctx = setup()
    await ctx.notifications.save(notification(N1, ID.otherUser))

    await expect(
      ctx.markNotificationRead(ID.user as string, N1 as string),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('marks all notifications read', async () => {
    const ctx = setup()
    await ctx.notifications.save(notification(N1))
    await ctx.notifications.save(notification(N2))

    await ctx.markAllNotificationsRead(ID.user as string)

    expect(await ctx.notifications.countUnread(ID.user)).toBe(0)
  })
})
