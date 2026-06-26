import type { EntityId } from '@lifedeck/domain'
import type { SubtaskSummary } from '@/dtos/subtask-dto'
import type { SubtaskRepository } from '@/ports/subtask-repository'

export async function summarizeSubtasks(
  subtasks: SubtaskRepository,
  taskIds: EntityId[],
): Promise<Map<string, SubtaskSummary>> {
  if (taskIds.length === 0) {
    return new Map()
  }
  const counts = await subtasks.countByTasks(taskIds)
  return new Map(
    counts.map(count => [
      count.taskId,
      { total: count.total, completed: count.completed },
    ]),
  )
}
