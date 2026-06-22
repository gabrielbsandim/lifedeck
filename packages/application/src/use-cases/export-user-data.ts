import { asEntityId } from '@taskin/domain'
import { NotFoundError } from '@/errors/use-case-error'
import { toUserView } from '@/mappers/user-mapper'
import { toListView } from '@/mappers/list-mapper'
import { toTaskView } from '@/mappers/task-mapper'
import { toRecurringTaskView } from '@/mappers/recurring-task-mapper'
import { toShareLinkView } from '@/mappers/share-link-mapper'
import { toNotificationView } from '@/mappers/notification-mapper'
import { toApiKeyView } from '@/mappers/api-key-mapper'
import type { UserView } from '@/dtos/user-dto'
import type { ListView } from '@/dtos/list-dto'
import type { TaskView } from '@/dtos/task-dto'
import type { RecurringTaskView } from '@/dtos/recurring-task-dto'
import type { ShareLinkView } from '@/dtos/share-link-dto'
import type { NotificationView } from '@/dtos/notification-dto'
import type { ApiKeyView } from '@/dtos/api-key-dto'
import type { UserRepository } from '@/ports/user-repository'
import type { ListRepository } from '@/ports/list-repository'
import type { TaskRepository } from '@/ports/task-repository'
import type { RecurringTaskRepository } from '@/ports/recurring-task-repository'
import type { ShareLinkRepository } from '@/ports/share-link-repository'
import type { NotificationRepository } from '@/ports/notification-repository'
import type { ApiKeyRepository } from '@/ports/api-key-repository'

const NOTIFICATION_EXPORT_LIMIT = 1000

export type UserDataExport = {
  exportedAt: string
  profile: UserView
  lists: Array<ListView & { tasks: TaskView[]; shareLinks: ShareLinkView[] }>
  recurringTasks: RecurringTaskView[]
  notifications: NotificationView[]
  apiKeys: ApiKeyView[]
}

type Dependencies = {
  users: UserRepository
  lists: ListRepository
  tasks: TaskRepository
  recurringTasks: RecurringTaskRepository
  shareLinks: ShareLinkRepository
  notifications: NotificationRepository
  apiKeys: ApiKeyRepository
}

export function makeExportUserData({
  users,
  lists,
  tasks,
  recurringTasks,
  shareLinks,
  notifications,
  apiKeys,
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
          tasks: listTasks.map(toTaskView),
          shareLinks: links.map(toShareLinkView),
        }
      }),
    )

    const [definitions, recentNotifications, keys] = await Promise.all([
      recurringTasks.listByOwner(owner),
      notifications.listByUser(owner, NOTIFICATION_EXPORT_LIMIT),
      apiKeys.listByUser(owner),
    ])

    return {
      exportedAt: now.toISOString(),
      profile: toUserView(user),
      lists: listExports,
      recurringTasks: definitions.map(toRecurringTaskView),
      notifications: recentNotifications.map(toNotificationView),
      apiKeys: keys.map(toApiKeyView),
    }
  }
}
