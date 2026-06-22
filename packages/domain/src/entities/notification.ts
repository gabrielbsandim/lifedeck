import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'

export type NotificationProps = {
  id: EntityId
  userId: EntityId
  type: string
  data: Record<string, string>
  readAt: Date | null
  createdAt: Date
}

export class Notification {
  private constructor(private props: NotificationProps) {}

  static create(input: {
    id: EntityId
    userId: EntityId
    type: string
    data: Record<string, string>
    createdAt: Date
  }): Notification {
    return new Notification({
      id: input.id,
      userId: input.userId,
      type: guard.notEmpty(input.type, 'Notification type'),
      data: input.data,
      readAt: null,
      createdAt: input.createdAt,
    })
  }

  static restore(props: NotificationProps): Notification {
    return new Notification({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get userId(): EntityId {
    return this.props.userId
  }

  get isRead(): boolean {
    return this.props.readAt !== null
  }

  markRead(now: Date): void {
    if (this.props.readAt === null) {
      this.props.readAt = now
    }
  }

  toJSON(): NotificationProps {
    return { ...this.props }
  }
}
