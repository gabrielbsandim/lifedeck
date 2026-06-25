import type { EntityId, Notification } from '@lifedeck/domain'
import type { NotificationRepository } from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'
import {
  toDomainNotification,
  toNotificationRecord,
  type NotificationRecord,
} from '@/database/notification-record'

function fromPrisma(record: {
  id: string
  userId: string
  type: string
  data: unknown
  readAt: Date | null
  createdAt: Date
}): NotificationRecord {
  return {
    id: record.id,
    userId: record.userId,
    type: record.type,
    data: (record.data ?? {}) as Record<string, string>,
    readAt: record.readAt,
    createdAt: record.createdAt,
  }
}

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(notification: Notification): Promise<void> {
    const record = toNotificationRecord(notification)
    await this.prisma.notification.upsert({
      where: { id: record.id },
      create: record,
      update: { readAt: record.readAt },
    })
  }

  async findById(id: EntityId): Promise<Notification | null> {
    const record = await this.prisma.notification.findUnique({ where: { id } })
    return record ? toDomainNotification(fromPrisma(record)) : null
  }

  async listByUser(userId: EntityId, limit: number): Promise<Notification[]> {
    const records = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return records.map(record => toDomainNotification(fromPrisma(record)))
  }

  async hasReminder(
    userId: EntityId,
    eventId: string,
    minutesBefore: string,
  ): Promise<boolean> {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        type: 'event-reminder',
        AND: [
          { data: { path: ['eventId'], equals: eventId } },
          { data: { path: ['minutesBefore'], equals: minutesBefore } },
        ],
      },
    })
    return count > 0
  }

  async countUnread(userId: EntityId): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    })
  }

  async markAllRead(userId: EntityId, now: Date): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: now },
    })
  }
}
