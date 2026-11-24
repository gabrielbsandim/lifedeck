import {
  BookingClient,
  BookingPage,
  BookingService,
  CalendarEvent,
  User,
  asEntityId,
  type BookingServiceSettings,
  type EntityId,
  type Entitlement,
} from '@lifedeck/domain'
import type { EnqueueJobInput } from '@/ports/job-queue'
import {
  makeLoadManagedBooking,
  makeLoadPublicPage,
} from '@/shared/booking-context'
import { makeBookingMailer } from '@/shared/booking-notice'
import {
  makeBookingLifecycle,
  makeUpsertBookingClient,
} from '@/shared/booking-records'
import {
  makeRefreshHostCalendar,
  makeServiceSlots,
} from '@/shared/booking-slots'
import { FakeBookingTokenSigner } from '@/testing/fake-booking-token-signer'
import { FakeEmailSender } from '@/testing/fake-email-sender'
import { FakeUnitOfWork } from '@/testing/fakes'
import {
  InMemoryAvailabilityRepository,
  InMemoryBookingClientRepository,
  InMemoryBookingPageRepository,
  InMemoryBookingRepository,
  InMemoryBookingServiceRepository,
} from '@/testing/in-memory-booking-repositories'
import { InMemoryCalendarEventRepository } from '@/testing/in-memory-calendar-event-repository'
import { InMemoryNotificationRepository } from '@/testing/in-memory-notification-repository'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { testPublishNotification } from '@/testing/test-publish-notification'
import { makeCreateCalendarEvent } from '@/use-cases/create-calendar-event'
import { makeDeleteCalendarEvent } from '@/use-cases/delete-calendar-event'
import { makeListCalendarEvents } from '@/use-cases/list-calendar-events'
import { makeUpdateCalendarEvent } from '@/use-cases/update-calendar-event'
import type { makePullCalendarChanges } from '@/use-cases/pull-calendar-changes'

// Sunday 2026-06-21, noon UTC. The page zone is UTC so hours read plainly.
export const BOOKING_NOW = new Date('2026-06-21T12:00:00.000Z')
export const OWNER = asEntityId('11111111-1111-4111-8111-111111111111')
export const STRANGER = asEntityId('22222222-2222-4222-8222-222222222222')
export const PAGE_ID = asEntityId('33333333-3333-4333-8333-333333333333')
export const SERVICE_ID = asEntityId('44444444-4444-4444-8444-444444444444')
export const CLIENT_ID = asEntityId('55555555-5555-4555-8555-555555555555')
export const APP_URL = 'https://lifedeck.test/'

export const at = (iso: string) => new Date(iso)

type PullCalendarChanges = ReturnType<typeof makePullCalendarChanges>

export function bookingFixture(
  options: {
    grants?: Entitlement[]
    pull?: PullCalendarChanges
  } = {},
) {
  let counter = 0
  const ids = {
    generate: (): EntityId => {
      counter += 1
      return asEntityId(
        `99999999-9999-4999-8999-${String(counter).padStart(12, '0')}`,
      )
    },
  }
  let now = BOOKING_NOW
  const clock = { now: () => now }
  const pages = new InMemoryBookingPageRepository()
  const services = new InMemoryBookingServiceRepository()
  const availability = new InMemoryAvailabilityRepository()
  const clients = new InMemoryBookingClientRepository()
  const bookings = new InMemoryBookingRepository()
  const calendarEvents = new InMemoryCalendarEventRepository()
  const users = new InMemoryUserRepository()
  const notifications = new InMemoryNotificationRepository()
  const emailSender = new FakeEmailSender()
  const tokens = new FakeBookingTokenSigner()
  const unitOfWork = new FakeUnitOfWork()
  const jobs: EnqueueJobInput[] = []
  const jobQueue = {
    enqueue: async (job: EnqueueJobInput) => {
      jobs.push(job)
    },
  }
  const warnings: string[] = []
  const logger = {
    error: () => {},
    info: () => {},
    warn: (message: string) => {
      warnings.push(message)
    },
  }
  const entitlements = {
    for: async () => ({
      plan: 'pro' as const,
      entitlements: options.grants ?? (['booking'] as Entitlement[]),
    }),
  }

  const calendarDeps = { calendarEvents, users, jobQueue, ids, clock }
  const listCalendarEvents = makeListCalendarEvents({ calendarEvents, users })
  const serviceSlots = makeServiceSlots({
    availability,
    bookings,
    listCalendarEvents,
    clock,
  })
  const pullCalendarChanges: PullCalendarChanges =
    options.pull ?? (async () => ({ applied: 0, failed: 0 }))
  const refreshHostCalendar = makeRefreshHostCalendar({
    pullCalendarChanges,
    logger,
  })
  const upsertBookingClient = makeUpsertBookingClient({ clients, ids, clock })
  const lifecycle = makeBookingLifecycle({
    bookings,
    createCalendarEvent: makeCreateCalendarEvent(calendarDeps),
    updateCalendarEvent: makeUpdateCalendarEvent(calendarDeps),
    deleteCalendarEvent: makeDeleteCalendarEvent({
      calendarEvents,
      jobQueue,
      clock,
    }),
    jobQueue,
    unitOfWork,
    ids,
    clock,
  })
  const loader = makeLoadPublicPage({ pages, services, entitlements })
  const loadManagedBooking = makeLoadManagedBooking({
    tokens,
    bookings,
    services,
    pages,
    clients,
  })
  const mailer = makeBookingMailer({
    pages,
    services,
    clients,
    emailSender,
    tokens,
    appUrl: APP_URL,
    clock,
  })
  const publishNotification = testPublishNotification(notifications)

  async function seedOwner(): Promise<User> {
    const owner = User.createGuest({
      id: OWNER,
      displayName: 'Ana Lima',
      locale: 'pt',
      timezone: 'UTC',
      createdAt: BOOKING_NOW,
    })
    await users.save(owner)
    return owner
  }

  // Page in UTC, Mondays and Tuesdays 09:00 to 12:00, one 60-minute service.
  async function seedPage(
    settings: Partial<BookingServiceSettings> = {},
  ): Promise<{ page: BookingPage; service: BookingService }> {
    await seedOwner()
    const page = BookingPage.create({
      id: PAGE_ID,
      ownerId: OWNER,
      slug: 'ana',
      displayName: 'Ana Lima',
      timezone: 'UTC',
      locale: 'pt',
      now: BOOKING_NOW,
    })
    await pages.save(page)
    const service = BookingService.create({
      id: SERVICE_ID,
      ownerId: OWNER,
      pageId: PAGE_ID,
      name: 'Aula',
      durationMin: 60,
      minNoticeMin: 0,
      location: { kind: 'online-link', url: 'https://meet.test/ana' },
      position: 0,
      now: BOOKING_NOW,
      ...settings,
    })
    await services.save(service)
    await availability.replaceWeekly(PAGE_ID, [
      { weekday: 1, startMinute: 540, endMinute: 720 },
      { weekday: 2, startMinute: 540, endMinute: 720 },
    ])
    return { page, service }
  }

  async function seedClient(): Promise<BookingClient> {
    const client = BookingClient.create({
      id: CLIENT_ID,
      ownerId: OWNER,
      name: 'João',
      email: 'joao@mail.com',
      phone: '+5511987654321',
      now: BOOKING_NOW,
    })
    await clients.save(client)
    return client
  }

  async function seedEvent(start: string, end: string, busy = true) {
    const event = CalendarEvent.create({
      id: ids.generate(),
      ownerId: OWNER,
      title: 'Busy',
      startsAt: at(start),
      endsAt: at(end),
      busy,
      now: BOOKING_NOW,
    })
    await calendarEvents.save(event)
    return event
  }

  return {
    ids,
    clock,
    setNow: (value: Date) => {
      now = value
    },
    pages,
    services,
    availability,
    clients,
    bookings,
    calendarEvents,
    users,
    notifications,
    emailSender,
    tokens,
    unitOfWork,
    jobs,
    jobQueue,
    warnings,
    logger,
    entitlements,
    listCalendarEvents,
    serviceSlots,
    refreshHostCalendar,
    upsertBookingClient,
    lifecycle,
    loader,
    loadManagedBooking,
    mailer,
    publishNotification,
    seedOwner,
    seedPage,
    seedClient,
    seedEvent,
  }
}

export type BookingFixture = ReturnType<typeof bookingFixture>
