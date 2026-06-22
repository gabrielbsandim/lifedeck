import type { RecurringTask } from '@taskin/domain'
import type { RecurringTaskView } from '@/dtos/recurring-task-dto'

export function toRecurringTaskView(task: RecurringTask): RecurringTaskView {
  const props = task.toJSON()
  return {
    id: props.id,
    ownerId: props.ownerId,
    title: props.title,
    rule: props.rule,
    createdAt: props.createdAt.toISOString(),
  }
}
