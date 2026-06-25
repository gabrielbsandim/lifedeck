import type { EntityId, Notification } from '@lifedeck/domain'
import type { NotificationRepository } from '@/ports/notification-repository'

export class InMemoryNotificationRepository implements NotificationRepository {
  private readonly items = new Map<string, Notification>()

  async save(notification: Notification): Promise<void> {
    this.items.set(notification.id as string, notification)
  }

  async findById(id: EntityId): Promise<Notification | null> {
    return this.items.get(id as string) ?? null
  }

  async listByUser(userId: EntityId, limit: number): Promise<Notification[]> {
    return [...this.items.values()]
      .filter(item => item.userId === userId)
      .sort(
        (a, b) =>
          b.toJSON().createdAt.getTime() - a.toJSON().createdAt.getTime(),
      )
      .slice(0, limit)
  }

  async hasReminder(
    userId: EntityId,
    eventId: string,
    minutesBefore: string,
  ): Promise<boolean> {
    return [...this.items.values()].some(item => {
      const stored = item.toJSON()
      return (
        item.userId === userId &&
        stored.type === 'event-reminder' &&
        stored.data.eventId === eventId &&
        stored.data.minutesBefore === minutesBefore
      )
    })
  }

  async countUnread(userId: EntityId): Promise<number> {
    return [...this.items.values()].filter(
      item => item.userId === userId && !item.isRead,
    ).length
  }

  async markAllRead(userId: EntityId, now: Date): Promise<void> {
    for (const item of this.items.values()) {
      if (item.userId === userId) {
        item.markRead(now)
      }
    }
  }
}
