import { Subtask, asEntityId } from '@lifedeck/domain'

export type SubtaskRecord = {
  id: string
  taskId: string
  title: string
  status: 'pending' | 'completed'
  position: number
  createdAt: Date
  completedAt: Date | null
}

export function toDomainSubtask(record: SubtaskRecord): Subtask {
  return Subtask.restore({
    id: asEntityId(record.id),
    taskId: asEntityId(record.taskId),
    title: record.title,
    status: record.status,
    position: record.position,
    createdAt: record.createdAt,
    completedAt: record.completedAt,
  })
}

export function toSubtaskRecord(subtask: Subtask): SubtaskRecord {
  const props = subtask.toJSON()
  return {
    id: props.id,
    taskId: props.taskId,
    title: props.title,
    status: props.status,
    position: props.position,
    createdAt: props.createdAt,
    completedAt: props.completedAt,
  }
}
