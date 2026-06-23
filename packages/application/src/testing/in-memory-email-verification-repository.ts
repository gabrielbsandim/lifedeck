import type { EmailVerification, EntityId } from '@lifedeck/domain'
import type { EmailVerificationRepository } from '@/ports/email-verification-repository'

export class InMemoryEmailVerificationRepository
  implements EmailVerificationRepository
{
  private readonly store = new Map<string, EmailVerification>()

  async save(verification: EmailVerification): Promise<void> {
    this.store.set(verification.userId, verification)
  }

  async findByUserId(userId: EntityId): Promise<EmailVerification | null> {
    return this.store.get(userId) ?? null
  }

  async deleteByUserId(userId: EntityId): Promise<void> {
    this.store.delete(userId)
  }
}
