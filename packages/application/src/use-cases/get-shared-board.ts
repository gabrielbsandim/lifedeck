import type { MemberRole } from '@lifedeck/domain'
import { type ListView } from '@/dtos/list-dto'
import { type TaskView } from '@/dtos/task-dto'
import { toListView } from '@/mappers/list-mapper'
import { toTaskView } from '@/mappers/task-mapper'
import { summarizeSubtasks } from '@/mappers/subtask-summary'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { ListRepository } from '@/ports/list-repository'
import type { ShareLinkRepository } from '@/ports/share-link-repository'
import type { SubtaskRepository } from '@/ports/subtask-repository'
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
  subtasks: SubtaskRepository
  clock: Clock
}

export function makeGetSharedBoard({
  shareLinks,
  lists,
  tasks,
  subtasks,
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
    if (!list || list.visibility !== 'link') {
      throw new NotFoundError('Shared list')
    }

    const items = await tasks.listByList(list.id)
    const visible = items.filter(task => !task.isPrivate)
    const summaries = await summarizeSubtasks(
      subtasks,
      visible.map(task => task.id),
    )
    return {
      list: toListView(list),
      tasks: visible.map(task => toTaskView(task, summaries.get(task.id))),
      role: link.role,
    }
  }
}
