import { EmailVerification, asEntityId } from '@taskin/domain'

export type EmailVerificationRecord = {
  id: string
  userId: string
  codeHash: string
  expiresAt: Date
  createdAt: Date
}

export function toDomainEmailVerification(
  record: EmailVerificationRecord,
): EmailVerification {
  return EmailVerification.restore({
    id: asEntityId(record.id),
    userId: asEntityId(record.userId),
    codeHash: record.codeHash,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
  })
}

export function toEmailVerificationRecord(
  verification: EmailVerification,
): EmailVerificationRecord {
  const props = verification.toJSON()
  return {
    id: props.id,
    userId: props.userId,
    codeHash: props.codeHash,
    expiresAt: props.expiresAt,
    createdAt: props.createdAt,
  }
}
