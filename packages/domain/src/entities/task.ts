import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'
import type { TaskStatus } from '@/value-objects/task-status'

const MAX_TITLE_LENGTH = 280
const MAX_OBSERVATION_LENGTH = 2000

export type TaskProps = {
  id: EntityId
  listId: EntityId
  title: string
  status: TaskStatus
  observation: string | null
  assigneeId: EntityId | null
  recurringTaskId: EntityId | null
  isPrivate: boolean
  position: number
  createdAt: Date
  completedAt: Date | null
}

export class Task {
  private constructor(private props: TaskProps) {}

  static create(input: {
    id: EntityId
    listId: EntityId
    title: string
    createdAt: Date
    position?: number
    recurringTaskId?: EntityId | null
  }): Task {
    const title = guard.maxLength(
      guard.notEmpty(input.title, 'Task title'),
      MAX_TITLE_LENGTH,
      'Task title',
    )

    return new Task({
      id: input.id,
      listId: input.listId,
      title,
      status: 'pending',
      observation: null,
      assigneeId: null,
      recurringTaskId: input.recurringTaskId ?? null,
      isPrivate: false,
      position: input.position ?? 0,
      createdAt: input.createdAt,
      completedAt: null,
    })
  }

  static restore(props: TaskProps): Task {
    return new Task({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get status(): TaskStatus {
    return this.props.status
  }

  get isCompleted(): boolean {
    return this.props.status === 'completed'
  }

  get isPrivate(): boolean {
    return this.props.isPrivate
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
      guard.notEmpty(title, 'Task title'),
      MAX_TITLE_LENGTH,
      'Task title',
    )
  }

  setObservation(observation: string | null): void {
    if (observation === null) {
      this.props.observation = null
      return
    }
    this.props.observation = guard.maxLength(
      observation,
      MAX_OBSERVATION_LENGTH,
      'Task observation',
    )
  }

  assignTo(assigneeId: EntityId | null): void {
    this.props.assigneeId = assigneeId
  }

  setPrivacy(isPrivate: boolean): void {
    this.props.isPrivate = isPrivate
  }

  toJSON(): TaskProps {
    return { ...this.props }
  }
}
