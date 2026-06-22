import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'

export type EmailVerificationProps = {
  id: EntityId
  userId: EntityId
  codeHash: string
  expiresAt: Date
  createdAt: Date
}

export class EmailVerification {
  private constructor(private props: EmailVerificationProps) {}

  static create(input: {
    id: EntityId
    userId: EntityId
    codeHash: string
    expiresAt: Date
    createdAt: Date
  }): EmailVerification {
    return new EmailVerification({
      id: input.id,
      userId: input.userId,
      codeHash: guard.notEmpty(input.codeHash, 'Verification code hash'),
      expiresAt: input.expiresAt,
      createdAt: input.createdAt,
    })
  }

  static restore(props: EmailVerificationProps): EmailVerification {
    return new EmailVerification({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get userId(): EntityId {
    return this.props.userId
  }

  get codeHash(): string {
    return this.props.codeHash
  }

  isExpired(now: Date): boolean {
    return now > this.props.expiresAt
  }

  toJSON(): EmailVerificationProps {
    return { ...this.props }
  }
}
