import { ValidationError } from '@/shared/domain-error'
import type { EntityId } from '@/shared/id'
import type { AiOperation } from '@/value-objects/ai-operation'

export type UsageEventProps = {
  id: EntityId
  userId: EntityId
  operation: AiOperation
  credits: number
  createdAt: Date
}

export class UsageEvent {
  private constructor(private props: UsageEventProps) {}

  static create(input: {
    id: EntityId
    userId: EntityId
    operation: AiOperation
    credits: number
    now: Date
  }): UsageEvent {
    if (!Number.isInteger(input.credits) || input.credits <= 0) {
      throw new ValidationError(
        'Usage event credits must be a positive integer.',
      )
    }
    return new UsageEvent({
      id: input.id,
      userId: input.userId,
      operation: input.operation,
      credits: input.credits,
      createdAt: input.now,
    })
  }

  static restore(props: UsageEventProps): UsageEvent {
    return new UsageEvent({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get userId(): EntityId {
    return this.props.userId
  }

  get operation(): AiOperation {
    return this.props.operation
  }

  get credits(): number {
    return this.props.credits
  }

  toJSON(): UsageEventProps {
    return { ...this.props }
  }
}
