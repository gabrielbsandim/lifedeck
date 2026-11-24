import {
  BOOKING_NOTICE_JOB,
  BOOKING_REMINDER_JOB,
  makeArchiveBookingService,
  makeBookingLifecycle,
  makeBookingMailer,
  makeCancelBooking,
  makeCancelBookingByToken,
  makeCheckBookingSlug,
  makeConfirmBooking,
  makeCreateBookingForClient,
  makeCreateBookingService,
  makeDeclineBooking,
  makeDeleteAvailabilityOverride,
  makeDeliverBookingNotice,
  makeDeliverBookingReminder,
  makeGetBookingSetup,
  makeGetManagedBooking,
  makeGetPublicBookingPage,
  makeListBookableSlots,
  makeListBookingClients,
  makeListBookings,
  makeListHostBookingSlots,
  makeLoadManagedBooking,
  makeLoadPublicPage,
  makeMarkBookingOutcome,
  makeRefreshHostCalendar,
  makeReorderBookingServices,
  makeRequestBooking,
  makeRescheduleBooking,
  makeRescheduleBookingByToken,
  makeServiceSlots,
  makeSetAvailability,
  makeSetAvailabilityOverride,
  makeUpdateBookingService,
  makeUpsertBookingClient,
  makeUpsertBookingClientForHost,
  makeUpsertBookingPage,
  type CalendarEventRepository,
  type Clock,
  type EmailSender,
  type EntitlementService,
  type IdGenerator,
  type JobQueue,
  type Logger,
  type UnitOfWork,
  type UserRepository,
  type makeCreateCalendarEvent,
  type makeDeleteCalendarEvent,
  type makeListCalendarEvents,
  type makePublishNotification,
  type makePullCalendarChanges,
  type makeUpdateCalendarEvent,
} from '@lifedeck/application'
import {
  HmacBookingTokenSigner,
  PrismaAvailabilityRepository,
  PrismaBookingClientRepository,
  PrismaBookingPageRepository,
  PrismaBookingRepository,
  PrismaBookingServiceRepository,
  type createTransactionalClient,
} from '@lifedeck/infrastructure'
import { bookingLinkSecret } from '@/server/booking-link-secret'

type JobHandler = (payload: Record<string, unknown>) => Promise<void>

export type BookingDependencies = {
  db: ReturnType<typeof createTransactionalClient>
  users: UserRepository
  emailSender: EmailSender
  entitlements: EntitlementService
  jobQueue: Pick<JobQueue, 'enqueue'>
  unitOfWork: UnitOfWork
  ids: IdGenerator
  clock: Clock
  logger: Logger
  listCalendarEvents: ReturnType<typeof makeListCalendarEvents>
  pullCalendarChanges: ReturnType<typeof makePullCalendarChanges>
  createCalendarEvent: ReturnType<typeof makeCreateCalendarEvent>
  updateCalendarEvent: ReturnType<typeof makeUpdateCalendarEvent>
  deleteCalendarEvent: ReturnType<typeof makeDeleteCalendarEvent>
  calendarEvents: CalendarEventRepository
  pushCalendarEvent: (ownerId: string, eventId: string) => Promise<unknown>
  publishNotification: ReturnType<typeof makePublishNotification>
  appUrl: string
  env: Record<string, string | undefined>
}

export function buildBooking(deps: BookingDependencies) {
  const { db, clock, logger } = deps
  const repos = {
    pages: new PrismaBookingPageRepository(db),
    services: new PrismaBookingServiceRepository(db),
    availability: new PrismaAvailabilityRepository(db),
    clients: new PrismaBookingClientRepository(db),
    bookings: new PrismaBookingRepository(db),
  }
  // The signer is built lazily so a missing secret fails the booking request
  // that needs it, not every unrelated route that touches the container.
  let signer: HmacBookingTokenSigner | null = null
  const tokens = {
    sign: (bookingId: string) => lazySigner().sign(bookingId),
    verify: (token: string) => lazySigner().verify(token),
  }
  function lazySigner(): HmacBookingTokenSigner {
    signer ??= new HmacBookingTokenSigner(bookingLinkSecret(deps.env))
    return signer
  }

  const serviceSlots = makeServiceSlots({
    availability: repos.availability,
    bookings: repos.bookings,
    listCalendarEvents: deps.listCalendarEvents,
    clock,
  })
  const refreshHostCalendar = makeRefreshHostCalendar({
    pullCalendarChanges: deps.pullCalendarChanges,
    logger,
  })
  const upsertBookingClient = makeUpsertBookingClient({
    clients: repos.clients,
    ids: deps.ids,
    clock,
  })
  const lifecycle = makeBookingLifecycle({
    bookings: repos.bookings,
    createCalendarEvent: deps.createCalendarEvent,
    updateCalendarEvent: deps.updateCalendarEvent,
    deleteCalendarEvent: deps.deleteCalendarEvent,
    jobQueue: deps.jobQueue,
    unitOfWork: deps.unitOfWork,
    ids: deps.ids,
    clock,
  })
  const loader = makeLoadPublicPage({
    pages: repos.pages,
    services: repos.services,
    entitlements: deps.entitlements,
  })
  const loadManagedBooking = makeLoadManagedBooking({
    tokens,
    bookings: repos.bookings,
    services: repos.services,
    pages: repos.pages,
    clients: repos.clients,
  })
  const mailer = makeBookingMailer({
    pages: repos.pages,
    services: repos.services,
    clients: repos.clients,
    emailSender: deps.emailSender,
    tokens,
    appUrl: deps.appUrl,
    clock,
    calendarEvents: deps.calendarEvents,
    pushCalendarEvent: deps.pushCalendarEvent,
  })
  const shared = {
    ...repos,
    calendarEvents: deps.calendarEvents,
    users: deps.users,
    ids: deps.ids,
    clock,
    unitOfWork: deps.unitOfWork,
    tokens,
    serviceSlots,
    refreshHostCalendar,
    upsertBookingClient,
    lifecycle,
    loader,
    loadManagedBooking,
    mailer,
    publishNotification: deps.publishNotification,
  }

  const deliverBookingNotice = makeDeliverBookingNotice(shared)
  const deliverBookingReminder = makeDeliverBookingReminder(shared)
  const jobHandlers: Record<string, JobHandler> = {
    [BOOKING_NOTICE_JOB]: deliverBookingNotice,
    [BOOKING_REMINDER_JOB]: deliverBookingReminder,
  }

  return {
    jobHandlers,
    getSetup: makeGetBookingSetup(shared),
    upsertPage: makeUpsertBookingPage(shared),
    checkSlug: makeCheckBookingSlug(shared),
    createService: makeCreateBookingService(shared),
    updateService: makeUpdateBookingService(shared),
    archiveService: makeArchiveBookingService(shared),
    reorderServices: makeReorderBookingServices(shared),
    setAvailability: makeSetAvailability(shared),
    setOverride: makeSetAvailabilityOverride(shared),
    deleteOverride: makeDeleteAvailabilityOverride(shared),
    listClients: makeListBookingClients(shared),
    upsertClient: makeUpsertBookingClientForHost(shared),
    listBookings: makeListBookings(shared),
    confirm: makeConfirmBooking(shared),
    decline: makeDeclineBooking(shared),
    cancel: makeCancelBooking(shared),
    reschedule: makeRescheduleBooking(shared),
    markOutcome: makeMarkBookingOutcome(shared),
    createForClient: makeCreateBookingForClient(shared),
    getPublicPage: makeGetPublicBookingPage(shared),
    listSlots: makeListBookableSlots(shared),
    listHostSlots: makeListHostBookingSlots(shared),
    request: makeRequestBooking(shared),
    getManaged: makeGetManagedBooking(shared),
    cancelByToken: makeCancelBookingByToken(shared),
    rescheduleByToken: makeRescheduleBookingByToken(shared),
  }
}

export type BookingContainer = ReturnType<typeof buildBooking>
