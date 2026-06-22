import type { EntityId } from '@/shared/id'
import type { MemberRole } from '@/value-objects/member-role'

export type ListMemberProps = {
  id: EntityId
  listId: EntityId
  userId: EntityId
  role: MemberRole
  addedAt: Date
}

export class ListMember {
  private constructor(private props: ListMemberProps) {}

  static create(input: {
    id: EntityId
    listId: EntityId
    userId: EntityId
    role: MemberRole
    addedAt: Date
  }): ListMember {
    return new ListMember({ ...input })
  }

  static restore(props: ListMemberProps): ListMember {
    return new ListMember({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get listId(): EntityId {
    return this.props.listId
  }

  get userId(): EntityId {
    return this.props.userId
  }

  get role(): MemberRole {
    return this.props.role
  }

  get isEditor(): boolean {
    return this.props.role === 'editor'
  }

  changeRole(role: MemberRole): void {
    this.props.role = role
  }

  toJSON(): ListMemberProps {
    return { ...this.props }
  }
}
