import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'
import type { MemberRole } from '@/value-objects/member-role'

export type ShareLinkProps = {
  id: EntityId
  listId: EntityId
  token: string
  role: MemberRole
  expiresAt: Date | null
  createdAt: Date
}

export class ShareLink {
  private constructor(private props: ShareLinkProps) {}

  static create(input: {
    id: EntityId
    listId: EntityId
    token: string
    role: MemberRole
    expiresAt: Date | null
    createdAt: Date
  }): ShareLink {
    return new ShareLink({
      id: input.id,
      listId: input.listId,
      token: guard.notEmpty(input.token, 'Share token'),
      role: input.role,
      expiresAt: input.expiresAt,
      createdAt: input.createdAt,
    })
  }

  static restore(props: ShareLinkProps): ShareLink {
    return new ShareLink({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get listId(): EntityId {
    return this.props.listId
  }

  get token(): string {
    return this.props.token
  }

  get role(): MemberRole {
    return this.props.role
  }

  isExpired(now: Date): boolean {
    return this.props.expiresAt !== null && now > this.props.expiresAt
  }

  toJSON(): ShareLinkProps {
    return { ...this.props }
  }
}
