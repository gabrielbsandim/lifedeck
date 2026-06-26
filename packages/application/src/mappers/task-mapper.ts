import type { Task } from '@lifedeck/domain'
import type { TaskView } from '@/dtos/task-dto'
import type { SubtaskSummary } from '@/dtos/subtask-dto'

const NO_SUBTASKS: SubtaskSummary = { total: 0, completed: 0 }

export function toTaskView(
  task: Task,
  subtasks: SubtaskSummary = NO_SUBTASKS,
): TaskView {
  const props = task.toJSON()
  return {
    subtasks,
    id: props.id,
    listId: props.listId,
    title: props.title,
    status: props.status,
    observation: props.observation,
    assigneeId: props.assigneeId,
    recurringTaskId: props.recurringTaskId,
    isPrivate: props.isPrivate,
    position: props.position,
    carriedFromDate: props.carriedFromDate
      ? props.carriedFromDate.toISOString().slice(0, 10)
      : null,
    carriedForward: props.carriedForwardAt !== null,
    createdAt: props.createdAt.toISOString(),
    completedAt: props.completedAt ? props.completedAt.toISOString() : null,
  }
}
