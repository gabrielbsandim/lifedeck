import { ValidationError } from '../shared/domain-error'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new ValidationError('Email address is invalid.')
    }
    return new Email(normalized)
  }

  equals(other: Email): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
