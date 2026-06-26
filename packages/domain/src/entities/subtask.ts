import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'
import type { TaskStatus } from '@/value-objects/task-status'

const MAX_TITLE_LENGTH = 280

export type SubtaskProps = {
  id: EntityId
  taskId: EntityId
  title: string
  status: TaskStatus
  position: number
  createdAt: Date
  completedAt: Date | null
}

export class Subtask {
  private constructor(private props: SubtaskProps) {}

  static create(input: {
    id: EntityId
    taskId: EntityId
    title: string
    createdAt: Date
    position?: number
  }): Subtask {
    const title = guard.maxLength(
      guard.notEmpty(input.title, 'Subtask title'),
      MAX_TITLE_LENGTH,
      'Subtask title',
    )

    return new Subtask({
      id: input.id,
      taskId: input.taskId,
      title,
      status: 'pending',
      position: input.position ?? 0,
      createdAt: input.createdAt,
      completedAt: null,
    })
  }

  static restore(props: SubtaskProps): Subtask {
    return new Subtask({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get taskId(): EntityId {
    return this.props.taskId
  }

  get status(): TaskStatus {
    return this.props.status
  }

  get isCompleted(): boolean {
    return this.props.status === 'completed'
  }

  get position(): number {
    return this.props.position
  }

  setPosition(position: number): void {
    this.props.position = position
  }

  complete(completedAt: Date): void {
    if (this.props.status === 'completed') {
      return
    }
    this.props.status = 'completed'
    this.props.completedAt = completedAt
  }

  reopen(): void {
    this.props.status = 'pending'
    this.props.completedAt = null
  }

  rename(title: string): void {
    this.props.title = guard.maxLength(
      guard.notEmpty(title, 'Subtask title'),
      MAX_TITLE_LENGTH,
      'Subtask title',
    )
  }

  toJSON(): SubtaskProps {
    return { ...this.props }
  }
}

export function areAllSubtasksCompleted(subtasks: Subtask[]): boolean {
  return subtasks.length > 0 && subtasks.every(subtask => subtask.isCompleted)
}
