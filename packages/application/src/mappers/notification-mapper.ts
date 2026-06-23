import type { Notification } from '@lifedeck/domain'
import type { NotificationView } from '@/dtos/notification-dto'

export function toNotificationView(
  notification: Notification,
): NotificationView {
  const props = notification.toJSON()
  return {
    id: props.id as string,
    type: props.type,
    data: props.data,
    isRead: props.readAt !== null,
    createdAt: props.createdAt.toISOString(),
  }
}
