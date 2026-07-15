import { ValidationError } from '@/shared/domain-error'
import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'
import {
  validateRecurrenceRule,
  type RecurrenceRule,
} from '@/value-objects/recurrence-rule'
import type { CalendarEventSource } from '@/value-objects/calendar-event-source'

const MAX_TITLE_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_LOCATION_LENGTH = 300
const MAX_REMINDERS = 5

export type CalendarEventProps = {
  id: EntityId
  ownerId: EntityId
  title: string
  description: string | null
  location: string | null
  startsAt: Date
  endsAt: Date
  allDay: boolean
  reminders: number[]
  recurrence: RecurrenceRule | null
  // When this event overrides a single occurrence of a recurring series, this
  // holds the external id of that series' master event and the original start
  // of the overridden occurrence. `cancelled` marks the occurrence as removed
  // (a deleted single instance) while keeping the row so expansion can hide it.
  recurrenceMasterExternalId: string | null
  originalStartsAt: Date | null
  cancelled: boolean
  source: CalendarEventSource
  connectionId: EntityId | null
  externalId: string | null
  etag: string | null
  syncedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

function normalizeReminders(reminders: number[]): number[] {
  for (const minutes of reminders) {
    if (!Number.isInteger(minutes) || minutes < 0) {
      throw new ValidationError(
        'Reminder offsets must be non-negative whole minutes.',
      )
    }
  }
  if (reminders.length > MAX_REMINDERS) {
    throw new ValidationError(
      `An event may have at most ${MAX_REMINDERS} reminders.`,
    )
  }
  return [...new Set(reminders)].sort((a, b) => a - b)
}

function cleanText(
  value: string | null | undefined,
  max: number,
  field: string,
): string | null {
  if (value === null || value === undefined) {
    return null
  }
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }
  return guard.maxLength(trimmed, max, field)
}

export class CalendarEvent {
  private constructor(private props: CalendarEventProps) {}

  static create(input: {
    id: EntityId
    ownerId: EntityId
    title: string
    description?: string | null
    location?: string | null
    startsAt: Date
    endsAt: Date
    allDay?: boolean
    reminders?: number[]
    recurrence?: RecurrenceRule | null
    recurrenceMasterExternalId?: string | null
    originalStartsAt?: Date | null
    cancelled?: boolean
    source?: CalendarEventSource
    connectionId?: EntityId | null
    externalId?: string | null
    etag?: string | null
    now: Date
  }): CalendarEvent {
    const title = guard.maxLength(
      guard.notEmpty(input.title, 'Event title'),
      MAX_TITLE_LENGTH,
      'Event title',
    )
    if (input.endsAt.getTime() < input.startsAt.getTime()) {
      throw new ValidationError('Event end must not be before its start.')
    }
    return new CalendarEvent({
      id: input.id,
      ownerId: input.ownerId,
      title,
      description: cleanText(
        input.description,
        MAX_DESCRIPTION_LENGTH,
        'Event description',
      ),
      location: cleanText(
        input.location,
        MAX_LOCATION_LENGTH,
        'Event location',
      ),
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      allDay: input.allDay ?? false,
      reminders: normalizeReminders(input.reminders ?? []),
      recurrence: input.recurrence
        ? validateRecurrenceRule(input.recurrence)
        : null,
      recurrenceMasterExternalId: input.recurrenceMasterExternalId ?? null,
      originalStartsAt: input.originalStartsAt ?? null,
      cancelled: input.cancelled ?? false,
      source: input.source ?? 'local',
      connectionId: input.connectionId ?? null,
      externalId: input.externalId ?? null,
      etag: input.etag ?? null,
      syncedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    })
  }

  static restore(props: CalendarEventProps): CalendarEvent {
    return new CalendarEvent({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get ownerId(): EntityId {
    return this.props.ownerId
  }

  get title(): string {
    return this.props.title
  }

  get description(): string | null {
    return this.props.description
  }

  get location(): string | null {
    return this.props.location
  }

  get allDay(): boolean {
    return this.props.allDay
  }

  get startsAt(): Date {
    return this.props.startsAt
  }

  get endsAt(): Date {
    return this.props.endsAt
  }

  get reminders(): number[] {
    return [...this.props.reminders]
  }

  get source(): CalendarEventSource {
    return this.props.source
  }

  get recurrence(): RecurrenceRule | null {
    return this.props.recurrence
  }

  get recurrenceMasterExternalId(): string | null {
    return this.props.recurrenceMasterExternalId
  }

  get originalStartsAt(): Date | null {
    return this.props.originalStartsAt
  }

  get cancelled(): boolean {
    return this.props.cancelled
  }

  get connectionId(): EntityId | null {
    return this.props.connectionId
  }

  get externalId(): string | null {
    return this.props.externalId
  }

  get etag(): string | null {
    return this.props.etag
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  isOwnedBy(userId: EntityId): boolean {
    return this.props.ownerId === userId
  }

  linkToExternal(
    externalId: string,
    etag: string | null,
    syncedAt: Date,
    connectionId: EntityId | null = null,
  ): void {
    this.props.externalId = externalId
    this.props.etag = etag
    this.props.syncedAt = syncedAt
    this.props.connectionId = connectionId
  }

  markSynced(etag: string | null, syncedAt: Date): void {
    this.props.etag = etag
    this.props.syncedAt = syncedAt
  }

  update(
    input: {
      title?: string
      description?: string | null
      location?: string | null
      startsAt?: Date
      endsAt?: Date
      allDay?: boolean
      reminders?: number[]
      recurrence?: RecurrenceRule | null
      cancelled?: boolean
    },
    now: Date,
  ): void {
    if (input.title !== undefined) {
      this.props.title = guard.maxLength(
        guard.notEmpty(input.title, 'Event title'),
        MAX_TITLE_LENGTH,
        'Event title',
      )
    }
    if (input.description !== undefined) {
      this.props.description = cleanText(
        input.description,
        MAX_DESCRIPTION_LENGTH,
        'Event description',
      )
    }
    if (input.location !== undefined) {
      this.props.location = cleanText(
        input.location,
        MAX_LOCATION_LENGTH,
        'Event location',
      )
    }
    if (input.startsAt !== undefined) {
      this.props.startsAt = input.startsAt
    }
    if (input.endsAt !== undefined) {
      this.props.endsAt = input.endsAt
    }
    if (this.props.endsAt.getTime() < this.props.startsAt.getTime()) {
      throw new ValidationError('Event end must not be before its start.')
    }
    if (input.allDay !== undefined) {
      this.props.allDay = input.allDay
    }
    if (input.reminders !== undefined) {
      this.props.reminders = normalizeReminders(input.reminders)
    }
    if (input.recurrence !== undefined) {
      this.props.recurrence = input.recurrence
        ? validateRecurrenceRule(input.recurrence)
        : null
    }
    if (input.cancelled !== undefined) {
      this.props.cancelled = input.cancelled
    }
    this.props.updatedAt = now
  }

  toJSON(): CalendarEventProps {
    return { ...this.props, reminders: [...this.props.reminders] }
  }
}
