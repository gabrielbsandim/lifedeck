import { asEntityId } from '@lifedeck/domain'
import { type NotificationListView } from '@/dtos/notification-dto'
import { toNotificationView } from '@/mappers/notification-mapper'
import type { NotificationRepository } from '@/ports/notification-repository'

const DEFAULT_LIMIT = 20

type Dependencies = {
  notifications: NotificationRepository
}

export function makeListNotifications({ notifications }: Dependencies) {
  return async function listNotifications(
    userId: string,
    limit = DEFAULT_LIMIT,
  ): Promise<NotificationListView> {
    const owner = asEntityId(userId)
    const items = await notifications.listByUser(owner, limit)
    const unread = await notifications.countUnread(owner)
    return {
      items: items.map(toNotificationView),
      unread,
    }
  }
}
