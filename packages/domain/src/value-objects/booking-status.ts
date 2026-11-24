export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'cancelled',
  'declined',
  'completed',
  'no_show',
] as const

export type BookingStatus = (typeof BOOKING_STATUSES)[number]

export const BOOKING_SOURCES = ['public', 'host', 'assistant'] as const

export type BookingSource = (typeof BOOKING_SOURCES)[number]

// Completed and no-show may be swapped so the host can correct a misclick;
// cancelled and declined are final.
const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ['confirmed', 'declined', 'cancelled'],
  confirmed: ['cancelled', 'completed', 'no_show'],
  cancelled: [],
  declined: [],
  completed: ['no_show'],
  no_show: ['completed'],
}

export function isBookingStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUSES as readonly string[]).includes(value)
}

export function isBookingSource(value: string): value is BookingSource {
  return (BOOKING_SOURCES as readonly string[]).includes(value)
}

export function canTransitionBooking(
  from: BookingStatus,
  to: BookingStatus,
): boolean {
  return TRANSITIONS[from].includes(to)
}

/** Pending and confirmed bookings hold their slot; every other status frees it. */
export function holdsSlot(status: BookingStatus): boolean {
  return status === 'pending' || status === 'confirmed'
}
