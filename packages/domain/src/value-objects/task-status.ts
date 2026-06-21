export const TASK_STATUSES = ['pending', 'completed'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value)
}
