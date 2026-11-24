import type { Booking, EntityId } from '@lifedeck/domain'

export interface BookingRepository {
  /** Throws SlotTakenError when a holding booking already overlaps. */
  save(booking: Booking): Promise<void>
  findById(id: EntityId): Promise<Booking | null>
  /** Every status, ordered by start; a booking overlapping the range counts. */
  listByOwnerInRange(
    ownerId: EntityId,
    from: Date,
    to: Date,
  ): Promise<Booking[]>
  findByCalendarEventId(calendarEventId: EntityId): Promise<Booking | null>
}
