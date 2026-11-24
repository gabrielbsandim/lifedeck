import { ValidationError } from '@/shared/domain-error'
import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'
import {
  validateBookingLocation,
  type BookingLocation,
} from '@/value-objects/booking-location'

const MAX_NAME_LENGTH = 80
const MAX_DESCRIPTION_LENGTH = 1000
const MAX_PRICE_LABEL_LENGTH = 40

export type BookingServiceProps = {
  id: EntityId
  ownerId: EntityId
  pageId: EntityId
  name: string
  description: string | null
  durationMin: number
  slotStepMin: number
  bufferBeforeMin: number
  bufferAfterMin: number
  minNoticeMin: number
  maxHorizonDays: number
  maxPerDay: number | null
  location: BookingLocation
  // Display text only; Life Deck never charges for a booking.
  priceLabel: string | null
  requiresApproval: boolean
  active: boolean
  position: number
  createdAt: Date
  updatedAt: Date
}

export type BookingServiceSettings = {
  name: string
  description?: string | null
  durationMin: number
  slotStepMin?: number
  bufferBeforeMin?: number
  bufferAfterMin?: number
  minNoticeMin?: number
  maxHorizonDays?: number
  maxPerDay?: number | null
  location: { kind: string; url?: string | null; address?: string | null }
  priceLabel?: string | null
  requiresApproval?: boolean
}

type Range = { min: number; max: number; label: string }

const RANGES = {
  durationMin: { min: 5, max: 480, label: 'Duration' },
  slotStepMin: { min: 5, max: 240, label: 'Slot interval' },
  bufferBeforeMin: { min: 0, max: 240, label: 'Buffer before' },
  bufferAfterMin: { min: 0, max: 240, label: 'Buffer after' },
  minNoticeMin: { min: 0, max: 30 * 24 * 60, label: 'Minimum notice' },
  maxHorizonDays: { min: 1, max: 365, label: 'Booking horizon' },
  maxPerDay: { min: 1, max: 50, label: 'Bookings per day' },
} satisfies Record<string, Range>

const DEFAULTS = {
  slotStepMin: 30,
  bufferBeforeMin: 0,
  bufferAfterMin: 0,
  minNoticeMin: 120,
  maxHorizonDays: 30,
}

function inRange(value: number, range: Range): number {
  if (!Number.isInteger(value) || value < range.min || value > range.max) {
    throw new ValidationError(
      `${range.label} must be a whole number from ${range.min} to ${range.max}.`,
    )
  }
  return value
}

function optionalText(
  value: string | null | undefined,
  max: number,
  field: string,
): string | null {
  const trimmed = value?.trim() ?? ''
  if (trimmed.length === 0) {
    return null
  }
  return guard.maxLength(trimmed, max, field)
}

function validateSettings(settings: BookingServiceSettings) {
  return {
    name: guard.maxLength(
      guard.notEmpty(settings.name, 'Service name'),
      MAX_NAME_LENGTH,
      'Service name',
    ),
    description: optionalText(
      settings.description,
      MAX_DESCRIPTION_LENGTH,
      'Description',
    ),
    durationMin: inRange(settings.durationMin, RANGES.durationMin),
    slotStepMin: inRange(
      settings.slotStepMin ?? DEFAULTS.slotStepMin,
      RANGES.slotStepMin,
    ),
    bufferBeforeMin: inRange(
      settings.bufferBeforeMin ?? DEFAULTS.bufferBeforeMin,
      RANGES.bufferBeforeMin,
    ),
    bufferAfterMin: inRange(
      settings.bufferAfterMin ?? DEFAULTS.bufferAfterMin,
      RANGES.bufferAfterMin,
    ),
    minNoticeMin: inRange(
      settings.minNoticeMin ?? DEFAULTS.minNoticeMin,
      RANGES.minNoticeMin,
    ),
    maxHorizonDays: inRange(
      settings.maxHorizonDays ?? DEFAULTS.maxHorizonDays,
      RANGES.maxHorizonDays,
    ),
    maxPerDay:
      settings.maxPerDay === null || settings.maxPerDay === undefined
        ? null
        : inRange(settings.maxPerDay, RANGES.maxPerDay),
    location: validateBookingLocation(settings.location),
    priceLabel: optionalText(
      settings.priceLabel,
      MAX_PRICE_LABEL_LENGTH,
      'Price label',
    ),
    requiresApproval: settings.requiresApproval ?? false,
  }
}

export class BookingService {
  private constructor(private props: BookingServiceProps) {}

  static create(
    input: BookingServiceSettings & {
      id: EntityId
      ownerId: EntityId
      pageId: EntityId
      position: number
      now: Date
    },
  ): BookingService {
    return new BookingService({
      id: input.id,
      ownerId: input.ownerId,
      pageId: input.pageId,
      ...validateSettings(input),
      active: true,
      position: input.position,
      createdAt: input.now,
      updatedAt: input.now,
    })
  }

  static restore(props: BookingServiceProps): BookingService {
    return new BookingService({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get ownerId(): EntityId {
    return this.props.ownerId
  }

  get pageId(): EntityId {
    return this.props.pageId
  }

  get name(): string {
    return this.props.name
  }

  get durationMin(): number {
    return this.props.durationMin
  }

  get location(): BookingLocation {
    return this.props.location
  }

  get requiresApproval(): boolean {
    return this.props.requiresApproval
  }

  get active(): boolean {
    return this.props.active
  }

  get position(): number {
    return this.props.position
  }

  isOwnedBy(userId: EntityId): boolean {
    return this.props.ownerId === userId
  }

  /** Replaces every setting; omitted optional fields fall back to defaults. */
  update(settings: BookingServiceSettings, now: Date): void {
    this.props = {
      ...this.props,
      ...validateSettings(settings),
      updatedAt: now,
    }
  }

  archive(now: Date): void {
    this.props.active = false
    this.props.updatedAt = now
  }

  moveTo(position: number, now: Date): void {
    if (!Number.isInteger(position) || position < 0) {
      throw new ValidationError('Position must be a non-negative integer.')
    }
    this.props.position = position
    this.props.updatedAt = now
  }

  toJSON(): BookingServiceProps {
    return { ...this.props }
  }
}
