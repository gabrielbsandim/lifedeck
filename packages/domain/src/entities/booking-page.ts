import { ValidationError } from '@/shared/domain-error'
import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'
import { validateBookingSlug } from '@/value-objects/booking-slug'
import { isTimeZone } from '@/value-objects/time-zone'

const MAX_NAME_LENGTH = 80
const MAX_HEADLINE_LENGTH = 200
const MAX_CANCEL_NOTICE_MIN = 7 * 24 * 60

export type BookingPageProps = {
  id: EntityId
  ownerId: EntityId
  slug: string
  displayName: string
  headline: string | null
  timezone: string
  locale: string
  // How long before the start a client may still cancel or reschedule.
  cancelNoticeMin: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

type EditableFields = {
  slug?: string
  displayName?: string
  headline?: string | null
  timezone?: string
  locale?: string
  cancelNoticeMin?: number
}

function validateTimezone(timezone: string): string {
  if (!isTimeZone(timezone)) {
    throw new ValidationError('Time zone is not recognized.')
  }
  return timezone
}

function validateCancelNotice(minutes: number): number {
  if (
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes > MAX_CANCEL_NOTICE_MIN
  ) {
    throw new ValidationError('Cancellation notice must be 0 to 7 days.')
  }
  return minutes
}

function cleanHeadline(headline: string | null | undefined): string | null {
  const trimmed = headline?.trim() ?? ''
  if (trimmed.length === 0) {
    return null
  }
  return guard.maxLength(trimmed, MAX_HEADLINE_LENGTH, 'Headline')
}

function cleanName(name: string): string {
  return guard.maxLength(
    guard.notEmpty(name, 'Display name'),
    MAX_NAME_LENGTH,
    'Display name',
  )
}

export class BookingPage {
  private constructor(private props: BookingPageProps) {}

  static create(input: {
    id: EntityId
    ownerId: EntityId
    slug: string
    displayName: string
    headline?: string | null
    timezone: string
    locale: string
    cancelNoticeMin?: number
    now: Date
  }): BookingPage {
    return new BookingPage({
      id: input.id,
      ownerId: input.ownerId,
      slug: validateBookingSlug(input.slug),
      displayName: cleanName(input.displayName),
      headline: cleanHeadline(input.headline),
      timezone: validateTimezone(input.timezone),
      locale: guard.notEmpty(input.locale, 'Locale'),
      cancelNoticeMin: validateCancelNotice(input.cancelNoticeMin ?? 0),
      active: true,
      createdAt: input.now,
      updatedAt: input.now,
    })
  }

  static restore(props: BookingPageProps): BookingPage {
    return new BookingPage({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get ownerId(): EntityId {
    return this.props.ownerId
  }

  get slug(): string {
    return this.props.slug
  }

  get displayName(): string {
    return this.props.displayName
  }

  get headline(): string | null {
    return this.props.headline
  }

  get timezone(): string {
    return this.props.timezone
  }

  get locale(): string {
    return this.props.locale
  }

  get cancelNoticeMin(): number {
    return this.props.cancelNoticeMin
  }

  get active(): boolean {
    return this.props.active
  }

  isOwnedBy(userId: EntityId): boolean {
    return this.props.ownerId === userId
  }

  update(fields: EditableFields, now: Date): void {
    const next = { ...this.props }
    if (fields.slug !== undefined) {
      next.slug = validateBookingSlug(fields.slug)
    }
    if (fields.displayName !== undefined) {
      next.displayName = cleanName(fields.displayName)
    }
    if (fields.headline !== undefined) {
      next.headline = cleanHeadline(fields.headline)
    }
    if (fields.timezone !== undefined) {
      next.timezone = validateTimezone(fields.timezone)
    }
    if (fields.locale !== undefined) {
      next.locale = guard.notEmpty(fields.locale, 'Locale')
    }
    if (fields.cancelNoticeMin !== undefined) {
      next.cancelNoticeMin = validateCancelNotice(fields.cancelNoticeMin)
    }
    this.props = { ...next, updatedAt: now }
  }

  setActive(active: boolean, now: Date): void {
    this.props.active = active
    this.props.updatedAt = now
  }

  toJSON(): BookingPageProps {
    return { ...this.props }
  }
}
