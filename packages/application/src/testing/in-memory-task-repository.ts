import type { EntityId, Task } from '@lifedeck/domain'
import type { TaskRepository } from '@/ports/task-repository'

export class InMemoryTaskRepository implements TaskRepository {
  private readonly store = new Map<string, Task>()

  async save(task: Task): Promise<void> {
    this.store.set(task.id, task)
  }

  async findById(id: EntityId): Promise<Task | null> {
    return this.store.get(id) ?? null
  }

  async listByList(listId: EntityId): Promise<Task[]> {
    return [...this.store.values()]
      .filter(task => task.toJSON().listId === listId)
      .sort((a, b) => a.position - b.position)
  }
}
