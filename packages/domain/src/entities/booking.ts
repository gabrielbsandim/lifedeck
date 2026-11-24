import { ValidationError } from '@/shared/domain-error'
import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'
import {
  canTransitionBooking,
  holdsSlot,
  type BookingSource,
  type BookingStatus,
} from '@/value-objects/booking-status'
import { isTimeZone } from '@/value-objects/time-zone'

const MAX_TEXT_LENGTH = 1000

export type BookingProps = {
  id: EntityId
  ownerId: EntityId
  serviceId: EntityId
  clientId: EntityId
  startsAt: Date
  endsAt: Date
  status: BookingStatus
  source: BookingSource
  calendarEventId: EntityId | null
  // Only for showing times back to the client; the slot itself is absolute.
  clientTimezone: string | null
  note: string | null
  cancelReason: string | null
  createdAt: Date
  updatedAt: Date
}

function validateWindow(startsAt: Date, endsAt: Date): void {
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new ValidationError('A booking must end after it starts.')
  }
}

function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  if (trimmed.length === 0) {
    return null
  }
  return guard.maxLength(trimmed, MAX_TEXT_LENGTH, 'Text')
}

export class Booking {
  private constructor(private props: BookingProps) {}

  static create(input: {
    id: EntityId
    ownerId: EntityId
    serviceId: EntityId
    clientId: EntityId
    startsAt: Date
    endsAt: Date
    requiresApproval: boolean
    source: BookingSource
    clientTimezone?: string | null
    note?: string | null
    now: Date
  }): Booking {
    validateWindow(input.startsAt, input.endsAt)
    const zone = input.clientTimezone ?? null
    return new Booking({
      id: input.id,
      ownerId: input.ownerId,
      serviceId: input.serviceId,
      clientId: input.clientId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: input.requiresApproval ? 'pending' : 'confirmed',
      source: input.source,
      calendarEventId: null,
      clientTimezone: zone !== null && isTimeZone(zone) ? zone : null,
      note: optionalText(input.note),
      cancelReason: null,
      createdAt: input.now,
      updatedAt: input.now,
    })
  }

  static restore(props: BookingProps): Booking {
    return new Booking({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get ownerId(): EntityId {
    return this.props.ownerId
  }

  get serviceId(): EntityId {
    return this.props.serviceId
  }

  get clientId(): EntityId {
    return this.props.clientId
  }

  get startsAt(): Date {
    return this.props.startsAt
  }

  get endsAt(): Date {
    return this.props.endsAt
  }

  get status(): BookingStatus {
    return this.props.status
  }

  get calendarEventId(): EntityId | null {
    return this.props.calendarEventId
  }

  get holdsSlot(): boolean {
    return holdsSlot(this.props.status)
  }

  isOwnedBy(userId: EntityId): boolean {
    return this.props.ownerId === userId
  }

  confirm(now: Date): void {
    this.moveTo('confirmed', now)
  }

  decline(reason: string | null, now: Date): void {
    this.moveTo('declined', now)
    this.props.cancelReason = optionalText(reason)
  }

  cancel(reason: string | null, now: Date): void {
    this.moveTo('cancelled', now)
    this.props.cancelReason = optionalText(reason)
  }

  markOutcome(outcome: 'completed' | 'no_show', now: Date): void {
    if (now.getTime() < this.props.startsAt.getTime()) {
      throw new ValidationError(
        'A booking that has not started has no outcome.',
      )
    }
    this.moveTo(outcome, now)
  }

  reschedule(startsAt: Date, endsAt: Date, now: Date): void {
    if (!this.holdsSlot) {
      throw new ValidationError(
        `A ${this.props.status} booking cannot be rescheduled.`,
      )
    }
    validateWindow(startsAt, endsAt)
    this.props.startsAt = startsAt
    this.props.endsAt = endsAt
    this.props.updatedAt = now
  }

  linkCalendarEvent(calendarEventId: EntityId | null, now: Date): void {
    this.props.calendarEventId = calendarEventId
    this.props.updatedAt = now
  }

  toJSON(): BookingProps {
    return { ...this.props }
  }

  private moveTo(status: BookingStatus, now: Date): void {
    if (!canTransitionBooking(this.props.status, status)) {
      throw new ValidationError(
        `A ${this.props.status} booking cannot become ${status}.`,
      )
    }
    this.props.status = status
    this.props.updatedAt = now
  }
}
