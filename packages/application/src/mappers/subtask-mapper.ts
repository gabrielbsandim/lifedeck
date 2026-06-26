import type { Subtask } from '@lifedeck/domain'
import type { SubtaskView } from '@/dtos/subtask-dto'

export function toSubtaskView(subtask: Subtask): SubtaskView {
  const props = subtask.toJSON()
  return {
    id: props.id,
    taskId: props.taskId,
    title: props.title,
    status: props.status,
    position: props.position,
    createdAt: props.createdAt.toISOString(),
    completedAt: props.completedAt ? props.completedAt.toISOString() : null,
  }
}
