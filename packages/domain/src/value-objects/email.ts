import { ValidationError } from '@/shared/domain-error'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// RFC 2606 / RFC 6761 reserve these for documentation and testing; no mail
// provider will ever deliver to them. Seed and fixture accounts use them, and
// every send attempt burns the job's whole retry budget before giving up.
const UNDELIVERABLE_DOMAINS = [
  'example.com',
  'example.net',
  'example.org',
  'example.edu',
]
const UNDELIVERABLE_SUFFIXES = ['.test', '.invalid', '.localhost', '.example']

/** `false` for addresses no mail provider will ever accept. */
export function isDeliverableEmail(raw: string): boolean {
  const normalized = raw.trim().toLowerCase()
  if (!EMAIL_PATTERN.test(normalized)) {
    return false
  }
  const domain = normalized.slice(normalized.lastIndexOf('@') + 1)
  if (UNDELIVERABLE_DOMAINS.includes(domain)) {
    return false
  }
  return !UNDELIVERABLE_SUFFIXES.some(suffix => domain.endsWith(suffix))
}

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
