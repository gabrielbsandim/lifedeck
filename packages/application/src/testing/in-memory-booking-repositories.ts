import type {
  AvailabilityOverride,
  Booking,
  BookingClient,
  BookingPage,
  BookingService,
  EntityId,
  WeeklyWindow,
} from '@lifedeck/domain'
import { SlotTakenError } from '@/errors/use-case-error'
import type { AvailabilityRepository } from '@/ports/availability-repository'
import type { BookingClientRepository } from '@/ports/booking-client-repository'
import type { BookingPageRepository } from '@/ports/booking-page-repository'
import type { BookingRepository } from '@/ports/booking-repository'
import type { BookingServiceRepository } from '@/ports/booking-service-repository'

export class InMemoryBookingPageRepository implements BookingPageRepository {
  readonly items = new Map<string, BookingPage>()

  async save(page: BookingPage): Promise<void> {
    this.items.set(page.id, page)
  }

  async findById(id: EntityId): Promise<BookingPage | null> {
    return this.items.get(id) ?? null
  }

  async findByOwner(ownerId: EntityId): Promise<BookingPage | null> {
    return [...this.items.values()].find(p => p.isOwnedBy(ownerId)) ?? null
  }

  async findBySlug(slug: string): Promise<BookingPage | null> {
    return [...this.items.values()].find(p => p.slug === slug) ?? null
  }
}

export class InMemoryBookingServiceRepository
  implements BookingServiceRepository
{
  readonly items = new Map<string, BookingService>()

  async save(service: BookingService): Promise<void> {
    this.items.set(service.id, service)
  }

  async findById(id: EntityId): Promise<BookingService | null> {
    return this.items.get(id) ?? null
  }

  async listByPage(pageId: EntityId): Promise<BookingService[]> {
    return [...this.items.values()]
      .filter(service => service.pageId === pageId)
      .sort((a, b) => a.position - b.position)
  }
}

export class InMemoryAvailabilityRepository implements AvailabilityRepository {
  readonly weekly = new Map<string, WeeklyWindow[]>()
  readonly overrides = new Map<string, Map<string, AvailabilityOverride>>()

  async getWeekly(pageId: EntityId): Promise<WeeklyWindow[]> {
    return this.weekly.get(pageId) ?? []
  }

  async replaceWeekly(pageId: EntityId, windows: WeeklyWindow[]) {
    this.weekly.set(pageId, [...windows])
  }

  async listOverrides(
    pageId: EntityId,
    fromDate: string,
    toDate: string,
  ): Promise<AvailabilityOverride[]> {
    return [...(this.overrides.get(pageId)?.values() ?? [])]
      .filter(o => o.date >= fromDate && o.date <= toDate)
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  async saveOverride(pageId: EntityId, override: AvailabilityOverride) {
    const byDate = this.overrides.get(pageId) ?? new Map()
    byDate.set(override.date, override)
    this.overrides.set(pageId, byDate)
  }

  async deleteOverride(pageId: EntityId, date: string): Promise<void> {
    this.overrides.get(pageId)?.delete(date)
  }
}

export class InMemoryBookingClientRepository
  implements BookingClientRepository
{
  readonly items = new Map<string, BookingClient>()

  async save(client: BookingClient): Promise<void> {
    this.items.set(client.id, client)
  }

  async findById(id: EntityId): Promise<BookingClient | null> {
    return this.items.get(id) ?? null
  }

  async findByPhone(ownerId: EntityId, phone: string) {
    return this.find(ownerId, client => client.phone === phone)
  }

  async findByEmail(ownerId: EntityId, email: string) {
    return this.find(ownerId, client => client.email === email)
  }

  async listByOwner(ownerId: EntityId): Promise<BookingClient[]> {
    return [...this.items.values()]
      .filter(client => client.isOwnedBy(ownerId))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  private find(
    ownerId: EntityId,
    match: (client: BookingClient) => boolean,
  ): BookingClient | null {
    return (
      [...this.items.values()].find(c => c.isOwnedBy(ownerId) && match(c)) ??
      null
    )
  }
}

function overlaps(a: Booking, b: Booking): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt
}

// Mirrors the bookings_no_overlap exclusion constraint so use-case tests see
// the same SlotTakenError a racing insert gets from Postgres.
export class InMemoryBookingRepository implements BookingRepository {
  readonly items = new Map<string, Booking>()

  async save(booking: Booking): Promise<void> {
    const clash = [...this.items.values()].some(
      other =>
        other.id !== booking.id &&
        other.ownerId === booking.ownerId &&
        other.holdsSlot &&
        booking.holdsSlot &&
        overlaps(other, booking),
    )
    if (clash) {
      throw new SlotTakenError()
    }
    this.items.set(booking.id, booking)
  }

  async findById(id: EntityId): Promise<Booking | null> {
    return this.items.get(id) ?? null
  }

  async listByOwnerInRange(
    ownerId: EntityId,
    from: Date,
    to: Date,
  ): Promise<Booking[]> {
    return [...this.items.values()]
      .filter(b => b.isOwnedBy(ownerId) && b.startsAt < to && b.endsAt > from)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  }

  async findByCalendarEventId(
    calendarEventId: EntityId,
  ): Promise<Booking | null> {
    return (
      [...this.items.values()].find(
        b => b.calendarEventId === calendarEventId,
      ) ?? null
    )
  }
}
