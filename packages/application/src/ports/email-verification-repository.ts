import type { EmailVerification, EntityId } from '@taskin/domain'

export interface EmailVerificationRepository {
  save(verification: EmailVerification): Promise<void>
  findByUserId(userId: EntityId): Promise<EmailVerification | null>
  deleteByUserId(userId: EntityId): Promise<void>
}
