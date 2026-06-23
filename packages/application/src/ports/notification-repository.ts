import type { EntityId, Notification } from '@lifedeck/domain'

export interface NotificationRepository {
  save(notification: Notification): Promise<void>
  findById(id: EntityId): Promise<Notification | null>
  listByUser(userId: EntityId, limit: number): Promise<Notification[]>
  countUnread(userId: EntityId): Promise<number>
  markAllRead(userId: EntityId, now: Date): Promise<void>
}
