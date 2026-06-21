import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'
import type { ListType } from '@/value-objects/list-type'
import type { Visibility } from '@/value-objects/visibility'

const MAX_TITLE_LENGTH = 120

export type ListProps = {
  id: EntityId
  ownerId: EntityId
  title: string
  type: ListType
  visibility: Visibility
  referenceDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export class List {
  private constructor(private props: ListProps) {}

  static create(input: {
    id: EntityId
    ownerId: EntityId
    title: string
    type: ListType
    visibility: Visibility
    referenceDate: Date | null
    createdAt: Date
  }): List {
    return new List({
      id: input.id,
      ownerId: input.ownerId,
      title: guard.maxLength(
        guard.notEmpty(input.title, 'List title'),
        MAX_TITLE_LENGTH,
        'List title',
      ),
      type: input.type,
      visibility: input.visibility,
      referenceDate: input.type === 'daily' ? input.referenceDate : null,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    })
  }

  static restore(props: ListProps): List {
    return new List({ ...props })
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

  get visibility(): Visibility {
    return this.props.visibility
  }

  isOwnedBy(userId: EntityId): boolean {
    return this.props.ownerId === userId
  }

  rename(title: string, now: Date): void {
    this.props.title = guard.maxLength(
      guard.notEmpty(title, 'List title'),
      MAX_TITLE_LENGTH,
      'List title',
    )
    this.props.updatedAt = now
  }

  setVisibility(visibility: Visibility, now: Date): void {
    this.props.visibility = visibility
    this.props.updatedAt = now
  }

  toJSON(): ListProps {
    return { ...this.props }
  }
}
