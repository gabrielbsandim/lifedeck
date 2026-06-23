import { asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { NotificationRepository } from '@/ports/notification-repository'

type Dependencies = {
  notifications: NotificationRepository
  clock: Clock
}

export function makeMarkNotificationRead({
  notifications,
  clock,
}: Dependencies) {
  return async function markNotificationRead(
    userId: string,
    notificationId: string,
  ): Promise<{ read: boolean }> {
    const notification = await notifications.findById(
      asEntityId(notificationId),
    )
    if (!notification || notification.userId !== asEntityId(userId)) {
      throw new NotFoundError('Notification')
    }
    notification.markRead(clock.now())
    await notifications.save(notification)
    return { read: true }
  }
}

export function makeMarkAllNotificationsRead({
  notifications,
  clock,
}: Dependencies) {
  return async function markAllNotificationsRead(
    userId: string,
  ): Promise<{ read: boolean }> {
    await notifications.markAllRead(asEntityId(userId), clock.now())
    return { read: true }
  }
}
