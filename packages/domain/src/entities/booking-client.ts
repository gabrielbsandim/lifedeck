import { ValidationError } from '@/shared/domain-error'
import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'
import { Email } from '@/value-objects/email'
import { isE164, normalizePhone } from '@/value-objects/phone-number'

const MAX_NAME_LENGTH = 120
const MAX_NOTES_LENGTH = 1000

// Someone who books with a host. Belongs to the host, who is the data
// controller; deduplicated per host by phone, then email.
export type BookingClientProps = {
  id: EntityId
  ownerId: EntityId
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

type Contact = {
  name: string
  email?: string | null
  phone?: string | null
  notes?: string | null
}

function cleanEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim() ?? ''
  return trimmed.length === 0 ? null : Email.create(trimmed).value
}

function cleanPhone(phone: string | null | undefined): string | null {
  const normalized = normalizePhone(phone ?? '')
  if (normalized.length === 0) {
    return null
  }
  if (!isE164(normalized)) {
    throw new ValidationError(
      'Phone must be a full international number, like +5511987654321.',
    )
  }
  return normalized
}

function cleanNotes(notes: string | null | undefined): string | null {
  const trimmed = notes?.trim() ?? ''
  if (trimmed.length === 0) {
    return null
  }
  return guard.maxLength(trimmed, MAX_NOTES_LENGTH, 'Notes')
}

function validateContact(contact: Contact) {
  const email = cleanEmail(contact.email)
  const phone = cleanPhone(contact.phone)
  if (email === null && phone === null) {
    throw new ValidationError('A client needs an email or a phone number.')
  }
  return {
    name: guard.maxLength(
      guard.notEmpty(contact.name, 'Client name'),
      MAX_NAME_LENGTH,
      'Client name',
    ),
    email,
    phone,
    notes: cleanNotes(contact.notes),
  }
}

export class BookingClient {
  private constructor(private props: BookingClientProps) {}

  static create(
    input: Contact & { id: EntityId; ownerId: EntityId; now: Date },
  ): BookingClient {
    return new BookingClient({
      id: input.id,
      ownerId: input.ownerId,
      ...validateContact(input),
      createdAt: input.now,
      updatedAt: input.now,
    })
  }

  static restore(props: BookingClientProps): BookingClient {
    return new BookingClient({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get ownerId(): EntityId {
    return this.props.ownerId
  }

  get name(): string {
    return this.props.name
  }

  get email(): string | null {
    return this.props.email
  }

  get phone(): string | null {
    return this.props.phone
  }

  isOwnedBy(userId: EntityId): boolean {
    return this.props.ownerId === userId
  }

  /** A repeat booking fills gaps and refreshes the name; it never erases. */
  mergeContact(
    contact: { name: string; email?: string | null; phone?: string | null },
    now: Date,
  ): void {
    const merged = validateContact({
      name: contact.name,
      email: cleanEmail(contact.email) ?? this.props.email,
      phone: cleanPhone(contact.phone) ?? this.props.phone,
      notes: this.props.notes,
    })
    this.props = { ...this.props, ...merged, updatedAt: now }
  }

  update(contact: Contact, now: Date): void {
    this.props = { ...this.props, ...validateContact(contact), updatedAt: now }
  }

  toJSON(): BookingClientProps {
    return { ...this.props }
  }
}
