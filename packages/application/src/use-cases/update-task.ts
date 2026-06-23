import {
  Notification,
  ValidationError,
  asEntityId,
  type EntityId,
} from '@lifedeck/domain'
import {
  updateTaskSchema,
  type UpdateTaskInput,
  type TaskView,
} from '@/dtos/task-dto'
import { toTaskView } from '@/mappers/task-mapper'
import { resolveListAccess } from '@/access/list-access'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { EmailLocale, EmailSender } from '@/ports/email-sender'
import type { IdGenerator } from '@/ports/id-generator'
import type { ListRepository } from '@/ports/list-repository'
import type { MembershipRepository } from '@/ports/membership-repository'
import type { NotificationRepository } from '@/ports/notification-repository'
import type { TaskRepository } from '@/ports/task-repository'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  tasks: TaskRepository
  lists: ListRepository
  memberships: MembershipRepository
  users: UserRepository
  notifications: NotificationRepository
  emailSender: EmailSender
  ids: IdGenerator
  clock: Clock
}

export function makeUpdateTask({
  tasks,
  lists,
  memberships,
  users,
  notifications,
  emailSender,
  ids,
  clock,
}: Dependencies) {
  return async function updateTask(
    requesterId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<TaskView> {
    const data = updateTaskSchema.parse(input)

    const task = await tasks.findById(asEntityId(taskId))
    if (!task) {
      throw new NotFoundError('Task')
    }

    const list = await lists.findById(task.toJSON().listId)
    if (!list) {
      throw new NotFoundError('Task')
    }
    const access = await resolveListAccess(list, requesterId, memberships)
    if (!access.canRead) {
      throw new NotFoundError('Task')
    }
    if (!access.canEdit) {
      throw new ForbiddenError('task')
    }

    if (data.title !== undefined) {
      task.rename(data.title)
    }
    if (data.observation !== undefined) {
      task.setObservation(data.observation)
    }
    if (data.status === 'completed') {
      task.complete(clock.now())
    }
    if (data.status === 'pending') {
      task.reopen()
    }
    if (data.isPrivate !== undefined) {
      task.setPrivacy(data.isPrivate)
    }
    let newlyAssigned: EntityId | null = null
    if (data.assigneeId !== undefined) {
      if (data.assigneeId === null) {
        task.assignTo(null)
      } else {
        const previousAssignee = task.toJSON().assigneeId
        const assignee = asEntityId(data.assigneeId)
        const isOwnerAssignee = list.isOwnedBy(assignee)
        const member = await memberships.findByListAndUser(list.id, assignee)
        if (!isOwnerAssignee && !member) {
          throw new ValidationError(
            'Assignee must be the owner or a member of the list.',
          )
        }
        task.assignTo(assignee)
        if (
          assignee !== previousAssignee &&
          assignee !== asEntityId(requesterId)
        ) {
          newlyAssigned = assignee
        }
      }
    }

    await tasks.save(task)

    if (newlyAssigned) {
      await notifyAssignee(
        newlyAssigned,
        task.toJSON().title,
        list.toJSON().title,
      )
    }

    return toTaskView(task)
  }

  async function notifyAssignee(
    assignee: EntityId,
    taskTitle: string,
    listTitle: string,
  ): Promise<void> {
    await notifications.save(
      Notification.create({
        id: ids.generate(),
        userId: assignee,
        type: 'task-assigned',
        data: { taskTitle, listTitle },
        createdAt: clock.now(),
      }),
    )

    const user = await users.findById(assignee)
    if (!user?.email) {
      return
    }
    const locale: EmailLocale = user.locale === 'pt' ? 'pt' : 'en'
    await emailSender.sendTaskAssignment(
      user.email,
      taskTitle,
      listTitle,
      locale,
    )
  }
}
