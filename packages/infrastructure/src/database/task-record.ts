import { Task, asEntityId } from '@taskin/domain'

export type TaskRecord = {
  id: string
  listId: string
  title: string
  status: 'pending' | 'completed'
  observation: string | null
  assigneeId: string | null
  recurringTaskId: string | null
  isPrivate: boolean
  position: number
  createdAt: Date
  completedAt: Date | null
}

export function toDomainTask(record: TaskRecord): Task {
  return Task.restore({
    id: asEntityId(record.id),
    listId: asEntityId(record.listId),
    title: record.title,
    status: record.status,
    observation: record.observation,
    assigneeId: record.assigneeId ? asEntityId(record.assigneeId) : null,
    recurringTaskId: record.recurringTaskId
      ? asEntityId(record.recurringTaskId)
      : null,
    isPrivate: record.isPrivate,
    position: record.position,
    createdAt: record.createdAt,
    completedAt: record.completedAt,
  })
}

export function toTaskRecord(task: Task): TaskRecord {
  const props = task.toJSON()
  return {
    id: props.id,
    listId: props.listId,
    title: props.title,
    status: props.status,
    observation: props.observation,
    assigneeId: props.assigneeId,
    recurringTaskId: props.recurringTaskId,
    isPrivate: props.isPrivate,
    position: props.position,
    createdAt: props.createdAt,
    completedAt: props.completedAt,
  }
}
