import { asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import { toUserView } from '@/mappers/user-mapper'
import { toListView } from '@/mappers/list-mapper'
import { toTaskView } from '@/mappers/task-mapper'
import { toRecurringTaskView } from '@/mappers/recurring-task-mapper'
import { toShareLinkView } from '@/mappers/share-link-mapper'
import { toNotificationView } from '@/mappers/notification-mapper'
import { toApiKeyView } from '@/mappers/api-key-mapper'
import { toCalendarEventView } from '@/mappers/calendar-event-mapper'
import type { UserView } from '@/dtos/user-dto'
import type { ListView } from '@/dtos/list-dto'
import type { TaskView } from '@/dtos/task-dto'
import type { RecurringTaskView } from '@/dtos/recurring-task-dto'
import type { ShareLinkView } from '@/dtos/share-link-dto'
import type { NotificationView } from '@/dtos/notification-dto'
import type { ApiKeyView } from '@/dtos/api-key-dto'
import type { CalendarEventView } from '@/dtos/calendar-event-dto'
import type { UserRepository } from '@/ports/user-repository'
import type { ListRepository } from '@/ports/list-repository'
import type { TaskRepository } from '@/ports/task-repository'
import type { RecurringTaskRepository } from '@/ports/recurring-task-repository'
import type { ShareLinkRepository } from '@/ports/share-link-repository'
import type { NotificationRepository } from '@/ports/notification-repository'
import type { ApiKeyRepository } from '@/ports/api-key-repository'
import type { SubscriptionRepository } from '@/ports/subscription-repository'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'
import type { ChannelIdentityRepository } from '@/ports/channel-identity-repository'

const NOTIFICATION_EXPORT_LIMIT = 1000

export type SubscriptionExport = {
  plan: string
  status: string
  provider: string
  currentPeriodEnd: string | null
}

export type ChannelExport = {
  channel: string
  address: string | null
  verifiedAt: string | null
}

export type UserDataExport = {
  exportedAt: string
  profile: UserView
  lists: Array<ListView & { tasks: TaskView[]; shareLinks: ShareLinkView[] }>
  recurringTasks: RecurringTaskView[]
  notifications: NotificationView[]
  apiKeys: ApiKeyView[]
  subscription: SubscriptionExport | null
  calendarEvents: CalendarEventView[]
  channels: ChannelExport[]
}

type Dependencies = {
  users: UserRepository
  lists: ListRepository
  tasks: TaskRepository
  recurringTasks: RecurringTaskRepository
  shareLinks: ShareLinkRepository
  notifications: NotificationRepository
  apiKeys: ApiKeyRepository
  subscriptions: SubscriptionRepository
  calendarEvents: CalendarEventRepository
  channelIdentities: ChannelIdentityRepository
}

export function makeExportUserData({
  users,
  lists,
  tasks,
  recurringTasks,
  shareLinks,
  notifications,
  apiKeys,
  subscriptions,
  calendarEvents,
  channelIdentities,
}: Dependencies) {
  return async function exportUserData(
    userId: string,
    now: Date,
  ): Promise<UserDataExport> {
    const owner = asEntityId(userId)
    const user = await users.findById(owner)
    if (!user) {
      throw new NotFoundError('User')
    }

    const ownedLists = await lists.listByOwner(owner)
    const listExports = await Promise.all(
      ownedLists.map(async list => {
        const [listTasks, links] = await Promise.all([
          tasks.listByList(list.id),
          shareLinks.listByList(list.id),
        ])
        return {
          ...toListView(list),
          tasks: listTasks.map(task => toTaskView(task)),
          shareLinks: links.map(toShareLinkView),
        }
      }),
    )

    const [
      definitions,
      recentNotifications,
      keys,
      subscription,
      events,
      whatsapp,
    ] = await Promise.all([
      recurringTasks.listByOwner(owner),
      notifications.listByUser(owner, NOTIFICATION_EXPORT_LIMIT),
      apiKeys.listByUser(owner),
      subscriptions.findByUser(owner),
      calendarEvents.listByOwner(owner),
      channelIdentities.findByUser(owner, 'whatsapp'),
    ])

    return {
      exportedAt: now.toISOString(),
      profile: toUserView(user),
      lists: listExports,
      recurringTasks: definitions.map(toRecurringTaskView),
      notifications: recentNotifications.map(toNotificationView),
      apiKeys: keys.map(toApiKeyView),
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            provider: subscription.provider,
            currentPeriodEnd:
              subscription.toJSON().currentPeriodEnd?.toISOString() ?? null,
          }
        : null,
      calendarEvents: events.map(toCalendarEventView),
      channels: whatsapp
        ? [
            {
              channel: whatsapp.channel,
              address: whatsapp.address,
              verifiedAt: whatsapp.verifiedAt?.toISOString() ?? null,
            },
          ]
        : [],
    }
  }
}
