import { Notification, asEntityId } from '@lifedeck/domain'

export type NotificationRecord = {
  id: string
  userId: string
  type: string
  data: Record<string, string>
  readAt: Date | null
  createdAt: Date
}

export function toDomainNotification(record: NotificationRecord): Notification {
  return Notification.restore({
    id: asEntityId(record.id),
    userId: asEntityId(record.userId),
    type: record.type,
    data: record.data,
    readAt: record.readAt,
    createdAt: record.createdAt,
  })
}

export function toNotificationRecord(
  notification: Notification,
): NotificationRecord {
  const props = notification.toJSON()
  return {
    id: props.id,
    userId: props.userId,
    type: props.type,
    data: props.data,
    readAt: props.readAt,
    createdAt: props.createdAt,
  }
}
