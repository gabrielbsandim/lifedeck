import type { EntityId, Subtask } from '@lifedeck/domain'

export type SubtaskCount = {
  taskId: string
  total: number
  completed: number
}

export interface SubtaskRepository {
  save(subtask: Subtask): Promise<void>
  findById(id: EntityId): Promise<Subtask | null>
  listByTask(taskId: EntityId): Promise<Subtask[]>
  countByTasks(taskIds: EntityId[]): Promise<SubtaskCount[]>
  delete(id: EntityId): Promise<void>
}
