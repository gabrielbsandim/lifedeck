import type { EntityId, Task } from '@lifedeck/domain'

export interface TaskRepository {
  save(task: Task): Promise<void>
  findById(id: EntityId): Promise<Task | null>
  listByList(listId: EntityId): Promise<Task[]>
  /**
   * Marks a task as carried forward only if nothing carried it yet, and says
   * whether this caller won. Only the winner may create the copy.
   */
  claimCarryForward(id: EntityId, at: Date): Promise<boolean>
  delete(id: EntityId): Promise<void>
}
