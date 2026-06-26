import type { EntityId, Subtask } from '@lifedeck/domain'
import type {
  SubtaskCount,
  SubtaskRepository,
} from '@/ports/subtask-repository'

export class InMemorySubtaskRepository implements SubtaskRepository {
  private readonly store = new Map<string, Subtask>()

  async save(subtask: Subtask): Promise<void> {
    this.store.set(subtask.id, subtask)
  }

  async findById(id: EntityId): Promise<Subtask | null> {
    return this.store.get(id) ?? null
  }

  async listByTask(taskId: EntityId): Promise<Subtask[]> {
    return [...this.store.values()]
      .filter(subtask => subtask.taskId === taskId)
      .sort((a, b) => a.position - b.position)
  }

  async countByTasks(taskIds: EntityId[]): Promise<SubtaskCount[]> {
    const wanted = new Set(taskIds as string[])
    const counts = new Map<string, SubtaskCount>()
    for (const subtask of this.store.values()) {
      const taskId = subtask.taskId as string
      if (!wanted.has(taskId)) {
        continue
      }
      const current = counts.get(taskId) ?? { taskId, total: 0, completed: 0 }
      current.total += 1
      if (subtask.isCompleted) {
        current.completed += 1
      }
      counts.set(taskId, current)
    }
    return [...counts.values()]
  }

  async delete(id: EntityId): Promise<void> {
    this.store.delete(id)
  }
}
