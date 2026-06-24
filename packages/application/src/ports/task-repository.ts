import type { EntityId, Task } from '@lifedeck/domain'

export interface TaskRepository {
  save(task: Task): Promise<void>
  findById(id: EntityId): Promise<Task | null>
  listByList(listId: EntityId): Promise<Task[]>
  delete(id: EntityId): Promise<void>
}
