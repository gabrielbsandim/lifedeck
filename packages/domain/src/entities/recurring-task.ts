import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'
import {
  validateRecurrenceRule,
  type RecurrenceRule,
} from '@/value-objects/recurrence-rule'

const MAX_TITLE_LENGTH = 280

export type RecurringTaskProps = {
  id: EntityId
  ownerId: EntityId
  title: string
  rule: RecurrenceRule
  createdAt: Date
}

export class RecurringTask {
  private constructor(private props: RecurringTaskProps) {}

  static create(input: {
    id: EntityId
    ownerId: EntityId
    title: string
    rule: RecurrenceRule
    createdAt: Date
  }): RecurringTask {
    return new RecurringTask({
      id: input.id,
      ownerId: input.ownerId,
      title: guard.maxLength(
        guard.notEmpty(input.title, 'Recurring task title'),
        MAX_TITLE_LENGTH,
        'Recurring task title',
      ),
      rule: validateRecurrenceRule(input.rule),
      createdAt: input.createdAt,
    })
  }

  static restore(props: RecurringTaskProps): RecurringTask {
    return new RecurringTask({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get ownerId(): EntityId {
    return this.props.ownerId
  }

  get title(): string {
    return this.props.title
  }

  get rule(): RecurrenceRule {
    return this.props.rule
  }

  toJSON(): RecurringTaskProps {
    return { ...this.props }
  }
}
