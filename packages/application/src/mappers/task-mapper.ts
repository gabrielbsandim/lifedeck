import type { Task } from '@taskin/domain'
import type { TaskView } from '@/dtos/task-dto'

export function toTaskView(task: Task): TaskView {
  const props = task.toJSON()
  return {
    id: props.id,
    listId: props.listId,
    title: props.title,
    status: props.status,
    observation: props.observation,
    assigneeId: props.assigneeId,
    createdAt: props.createdAt.toISOString(),
    completedAt: props.completedAt ? props.completedAt.toISOString() : null,
  }
}
