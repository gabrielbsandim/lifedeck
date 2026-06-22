import type { MemberRole } from '@taskin/domain'
import { type ListView } from '@/dtos/list-dto'
import { type TaskView } from '@/dtos/task-dto'
import { toListView } from '@/mappers/list-mapper'
import { toTaskView } from '@/mappers/task-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { ListRepository } from '@/ports/list-repository'
import type { ShareLinkRepository } from '@/ports/share-link-repository'
import type { TaskRepository } from '@/ports/task-repository'

export type SharedBoardView = {
  list: ListView
  tasks: TaskView[]
  role: MemberRole
}

type Dependencies = {
  shareLinks: ShareLinkRepository
  lists: ListRepository
  tasks: TaskRepository
  clock: Clock
}

export function makeGetSharedBoard({
  shareLinks,
  lists,
  tasks,
  clock,
}: Dependencies) {
  return async function getSharedBoard(
    token: string,
  ): Promise<SharedBoardView> {
    const link = await shareLinks.findByToken(token)
    if (!link || link.isExpired(clock.now())) {
      throw new NotFoundError('Shared list')
    }

    const list = await lists.findById(link.listId)
    if (!list) {
      throw new NotFoundError('Shared list')
    }

    const items = await tasks.listByList(list.id)
    return {
      list: toListView(list),
      tasks: items.filter(task => !task.isPrivate).map(toTaskView),
      role: link.role,
    }
  }
}
