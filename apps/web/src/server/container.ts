import {
  asEntityId,
  civilDate,
  DEFAULT_TIME_ZONE,
  zonedIso,
  zonedWeekday,
} from '@lifedeck/domain'
import {
  makeAuthenticateApiKey,
  makeBringTaskToToday,
  makeChangePassword,
  makeConnectGoogleCalendar,
  makeListCalendarConnections,
  makeDisconnectCalendar,
  makeSetDefaultCalendar,
  makeConsumeCredits,
  makeRefundCredits,
  makeCreateApiKey,
  makeCreateCalendarEvent,
  makeCreateGuestUser,
  makeDeleteRemoteCalendarEvent,
  makeDeliverReminder,
  makeEnqueueDailyDigests,
  makeReconcileCalendars,
  makeRenewCalendarChannels,
  makeStartWhatsappPairing,
  makeGetWhatsappChannel,
  makeHandleInboundWhatsApp,
  makeHandleCalendarNotification,
  makePullCalendarChanges,
  makePushCalendarEvent,
  makeWatchGoogleCalendar,
  CALENDAR_PULL_JOB,
  CALENDAR_PUSH_JOB,
  CALENDAR_DELETE_JOB,
  CALENDAR_WATCH_JOB,
  DAILY_DIGEST_JOB,
  REMINDER_JOB,
  makeCreateList,
  makeDeleteCalendarEvent,
  makeUpdateCalendarOccurrence,
  makeDeleteCalendarOccurrence,
  makeDeleteList,
  makeDeleteTask,
  makeGetCalendarEvent,
  makeLeaveList,
  makeListCalendarEvents,
  makeRenameList,
  makeReorderTasks,
  makeCreateRecurringTask,
  makeCreateShareLink,
  makeCreateTask,
  makeDeleteRecurringTask,
  makeDeleteUser,
  makeCheckHealth,
  makeDispatchDueJobs,
  makeExportUserData,
  makeGenerateList,
  makeGetAnalytics,
  makeGetDailyBoard,
  makeGetGoogleAuthUrl,
  makeGetList,
  makeGetSharedBoard,
  makeGetUsage,
  makeGetUser,
  makeHandleSubscriptionWebhook,
  makeGetSubscription,
  makeCancelSubscription,
  makeStartLocalCheckout,
  makeInviteToList,
  makeJoinListByToken,
  makeListApiKeys,
  makeListListTasks,
  makeCreateSubtask,
  makeListSubtasks,
  makeUpdateSubtask,
  makeDeleteSubtask,
  makeReorderSubtasks,
  makeListMembers,
  makeListNotifications,
  makeMarkAllNotificationsRead,
  makeMarkNotificationRead,
  makeListRecurringTasks,
  makeListShareLinks,
  makeListUserLists,
  makeRegisterWithEmail,
  makeRemoveMember,
  makeRenameUser,
  makeRequestEmailVerification,
  makeResolvePlanFromSubscription,
  makeRevokeApiKey,
  makeRevokeShareLink,
  makeSendDailyDigest,
  makeStartCheckout,
  makeSetCarryOverMode,
  makeSetReminderPreferences,
  makeSetTimezone,
  makeSetWeatherLocation,
  makePreviewWeatherLocation,
  makeSetAvatar,
  makeRemoveAvatar,
  makeSignInWithEmail,
  makeSignInWithGoogle,
  makeUpdateCalendarEvent,
  makeUpdateRecurringTask,
  makeUpdateTask,
  makeVerifyEmail,
  type AnalyticsRepository,
  type ApiKeyRepository,
  type EmailSender,
  type KeyHasher,
  type EmailVerificationRepository,
  type HealthProbe,
  type ListGenerator,
  type ListRepository,
  type MembershipRepository,
  type NotificationRepository,
  type OAuthProvider,
  type PasswordHasher,
  type RecurringTaskRepository,
  type ScheduledJobRepository,
  type ShareLinkRepository,
  type SubscriptionRepository,
  type CheckoutIntentRepository,
  type BillingCustomerRepository,
  type UsageEventLedger,
  type UsageMeter,
  type CalendarEventRepository,
  type CalendarConnectionRepository,
  type CalendarProvider,
  type ChannelIdentityRepository,
  type MessagingChannel,
  type AssistantTools,
  type ConversationStore,
  type WhatsappSessionWindow,
  type Transcriber,
  type VisionReader,
  type TaskRepository,
  type SubtaskRepository,
  type UnitOfWork,
  type UserRepository,
  type FileStorage,
  type EntitlementService,
} from '@lifedeck/application'
import {
  AiSdkListGenerator,
  ConsoleEmailSender,
  createGoogleListGenerator,
  GoogleOAuthProvider,
  NumericCodeGenerator,
  PrismaAnalyticsRepository,
  PrismaApiKeyRepository,
  PrismaHealthProbe,
  PrismaEmailVerificationRepository,
  PrismaListRepository,
  PrismaMembershipRepository,
  PrismaNotificationRepository,
  PrismaRecurringTaskRepository,
  PrismaScheduledJobRepository,
  PrismaShareLinkRepository,
  PrismaSubscriptionRepository,
  PrismaCheckoutIntentRepository,
  PrismaBillingCustomerRepository,
  PrismaUsageEventRepository,
  PrismaCalendarEventRepository,
  PrismaCalendarConnectionRepository,
  PrismaChannelIdentityRepository,
  PrismaTaskRepository,
  PrismaSubtaskRepository,
  PrismaUserRepository,
  AsaasPaymentGateway,
  StripePaymentGateway,
  GoogleCalendarProvider,
  OutboxJobQueue,
  QStashJobScheduler,
  NoopJobScheduler,
  createMessagingChannel,
  createAgentRunner,
  createConversationStore,
  createWhatsappSessionWindow,
  createTranscriber,
  createVisionReader,
  createUsageMeter,
  Argon2PasswordHasher,
  RandomTokenGenerator,
  ResendEmailSender,
  ScryptPasswordHasher,
  Sha256KeyHasher,
  PlanEntitlementService,
  OpenMeteoWeatherProvider,
  StubListGenerator,
  SystemClock,
  UuidGenerator,
  PrismaUnitOfWork,
  VercelBlobStorage,
  createTransactionalClient,
  prisma,
} from '@lifedeck/infrastructure'
import { createRedisHealthProbe } from '@/server/api/redis-health-probe'
import { log } from '@/server/api/logger'
import { SITE_NAME, siteUrl } from '@/lib/site'

type Container = {
  createTask: ReturnType<typeof makeCreateTask>
  updateTask: ReturnType<typeof makeUpdateTask>
  deleteTask: ReturnType<typeof makeDeleteTask>
  listListTasks: ReturnType<typeof makeListListTasks>
  createSubtask: ReturnType<typeof makeCreateSubtask>
  listSubtasks: ReturnType<typeof makeListSubtasks>
  updateSubtask: ReturnType<typeof makeUpdateSubtask>
  deleteSubtask: ReturnType<typeof makeDeleteSubtask>
  reorderSubtasks: ReturnType<typeof makeReorderSubtasks>
  createGuestUser: ReturnType<typeof makeCreateGuestUser>
  getUser: ReturnType<typeof makeGetUser>
  registerWithEmail: ReturnType<typeof makeRegisterWithEmail>
  requestEmailVerification: ReturnType<typeof makeRequestEmailVerification>
  verifyEmail: ReturnType<typeof makeVerifyEmail>
  signInWithEmail: ReturnType<typeof makeSignInWithEmail>
  signInWithGoogle: ReturnType<typeof makeSignInWithGoogle>
  getGoogleAuthUrl: ReturnType<typeof makeGetGoogleAuthUrl>
  changePassword: ReturnType<typeof makeChangePassword>
  renameUser: ReturnType<typeof makeRenameUser>
  deleteUser: ReturnType<typeof makeDeleteUser>
  exportUserData: ReturnType<typeof makeExportUserData>
  createList: ReturnType<typeof makeCreateList>
  renameList: ReturnType<typeof makeRenameList>
  deleteList: ReturnType<typeof makeDeleteList>
  reorderTasks: ReturnType<typeof makeReorderTasks>
  getList: ReturnType<typeof makeGetList>
  listUserLists: ReturnType<typeof makeListUserLists>
  getDailyBoard: ReturnType<typeof makeGetDailyBoard>
  bringTaskToToday: ReturnType<typeof makeBringTaskToToday>
  setCarryOverMode: ReturnType<typeof makeSetCarryOverMode>
  setReminderPreferences: ReturnType<typeof makeSetReminderPreferences>
  setTimezone: ReturnType<typeof makeSetTimezone>
  setWeatherLocation: ReturnType<typeof makeSetWeatherLocation>
  previewWeatherLocation: ReturnType<typeof makePreviewWeatherLocation>
  setAvatar: ReturnType<typeof makeSetAvatar>
  removeAvatar: ReturnType<typeof makeRemoveAvatar>
  createRecurringTask: ReturnType<typeof makeCreateRecurringTask>
  listRecurringTasks: ReturnType<typeof makeListRecurringTasks>
  updateRecurringTask: ReturnType<typeof makeUpdateRecurringTask>
  deleteRecurringTask: ReturnType<typeof makeDeleteRecurringTask>
  createShareLink: ReturnType<typeof makeCreateShareLink>
  inviteToList: ReturnType<typeof makeInviteToList>
  listShareLinks: ReturnType<typeof makeListShareLinks>
  revokeShareLink: ReturnType<typeof makeRevokeShareLink>
  getSharedBoard: ReturnType<typeof makeGetSharedBoard>
  joinListByToken: ReturnType<typeof makeJoinListByToken>
  listMembers: ReturnType<typeof makeListMembers>
  removeMember: ReturnType<typeof makeRemoveMember>
  leaveList: ReturnType<typeof makeLeaveList>
  getAnalytics: ReturnType<typeof makeGetAnalytics>
  generateList: ReturnType<typeof makeGenerateList>
  sendDailyDigest: ReturnType<typeof makeSendDailyDigest>
  listNotifications: ReturnType<typeof makeListNotifications>
  markNotificationRead: ReturnType<typeof makeMarkNotificationRead>
  markAllNotificationsRead: ReturnType<typeof makeMarkAllNotificationsRead>
  createApiKey: ReturnType<typeof makeCreateApiKey>
  listApiKeys: ReturnType<typeof makeListApiKeys>
  revokeApiKey: ReturnType<typeof makeRevokeApiKey>
  authenticateApiKey: ReturnType<typeof makeAuthenticateApiKey>
  checkHealth: ReturnType<typeof makeCheckHealth>
  dispatchDueJobs: ReturnType<typeof makeDispatchDueJobs>
  startCheckout: ReturnType<typeof makeStartCheckout>
  handleSubscriptionWebhook: ReturnType<typeof makeHandleSubscriptionWebhook>
  startLocalCheckout: ReturnType<typeof makeStartLocalCheckout>
  getSubscription: ReturnType<typeof makeGetSubscription>
  cancelSubscription: ReturnType<typeof makeCancelSubscription>
  consumeCredits: ReturnType<typeof makeConsumeCredits>
  refundCredits: ReturnType<typeof makeRefundCredits>
  getUsage: ReturnType<typeof makeGetUsage>
  createCalendarEvent: ReturnType<typeof makeCreateCalendarEvent>
  updateCalendarEvent: ReturnType<typeof makeUpdateCalendarEvent>
  updateCalendarOccurrence: ReturnType<typeof makeUpdateCalendarOccurrence>
  deleteCalendarEvent: ReturnType<typeof makeDeleteCalendarEvent>
  deleteCalendarOccurrence: ReturnType<typeof makeDeleteCalendarOccurrence>
  listCalendarEvents: ReturnType<typeof makeListCalendarEvents>
  getCalendarEvent: ReturnType<typeof makeGetCalendarEvent>
  connectGoogleCalendar: ReturnType<typeof makeConnectGoogleCalendar>
  listCalendarConnections: ReturnType<typeof makeListCalendarConnections>
  disconnectCalendar: ReturnType<typeof makeDisconnectCalendar>
  setDefaultCalendar: ReturnType<typeof makeSetDefaultCalendar>
  pullCalendarChanges: ReturnType<typeof makePullCalendarChanges>
  pushCalendarEvent: ReturnType<typeof makePushCalendarEvent>
  watchGoogleCalendar: ReturnType<typeof makeWatchGoogleCalendar>
  handleCalendarNotification: ReturnType<typeof makeHandleCalendarNotification>
  googleCalendarAuthUrl: (state: string) => string
  runScheduledFanOut: () => Promise<{
    digests: number
    reconciled: number
    renewed: number
  }>
  startWhatsappPairing: ReturnType<typeof makeStartWhatsappPairing>
  getWhatsappChannel: ReturnType<typeof makeGetWhatsappChannel>
  handleInboundWhatsApp: ReturnType<typeof makeHandleInboundWhatsApp>
  entitlements: EntitlementService
}

type Repositories = {
  tasks: TaskRepository
  subtasks: SubtaskRepository
  users: UserRepository
  lists: ListRepository
  recurringTasks: RecurringTaskRepository
  shareLinks: ShareLinkRepository
  memberships: MembershipRepository
  emailVerifications: EmailVerificationRepository
  analytics: AnalyticsRepository
  notifications: NotificationRepository
  apiKeys: ApiKeyRepository
  scheduledJobs: ScheduledJobRepository
  subscriptions: SubscriptionRepository
  checkoutIntents: CheckoutIntentRepository
  billingCustomers: BillingCustomerRepository
  usageEvents: UsageEventLedger
  calendarEvents: CalendarEventRepository
  calendarConnections: CalendarConnectionRepository
  channelIdentities: ChannelIdentityRepository
}

type Services = {
  hasher: PasswordHasher
  keyHasher: KeyHasher
  emailSender: EmailSender
  oauth: OAuthProvider
  listGenerator: ListGenerator
  healthProbes: HealthProbe[]
  fileStorage: FileStorage
  usageMeter: UsageMeter
  googleCalendar: CalendarProvider & { authUrl(state: string): string }
  messaging: MessagingChannel
  conversations: ConversationStore
  whatsappSession: WhatsappSessionWindow
  transcriber: Transcriber
  visionReader: VisionReader
}

// Minutes-before-start reminder applied to an event the assistant creates when
// the user did not ask for a specific reminder.
const ASSISTANT_DEFAULT_REMINDER_MINUTES = 30

function build(
  {
    tasks,
    subtasks,
    users,
    lists,
    recurringTasks,
    shareLinks,
    memberships,
    emailVerifications,
    analytics,
    notifications,
    apiKeys,
    scheduledJobs,
    subscriptions,
    checkoutIntents,
    billingCustomers,
    usageEvents,
    calendarEvents,
    calendarConnections,
    channelIdentities,
  }: Repositories,
  {
    hasher,
    keyHasher,
    emailSender,
    oauth,
    listGenerator,
    healthProbes,
    fileStorage,
    usageMeter,
    googleCalendar,
    messaging,
    conversations,
    whatsappSession,
    transcriber,
    visionReader,
  }: Services,
  unitOfWork: UnitOfWork,
): Container {
  const clock = new SystemClock()
  const ids = new UuidGenerator()
  const tokens = new RandomTokenGenerator()
  const codes = new NumericCodeGenerator()
  const getDailyBoard = makeGetDailyBoard({
    lists,
    tasks,
    subtasks,
    recurringTasks,
    users,
    ids,
    clock,
    unitOfWork,
  })
  const sendDailyDigest = makeSendDailyDigest({
    getDailyBoard,
    users,
    emailSender,
    clock,
  })
  // Event-driven dispatch: when QStash is configured, each enqueued job gets a
  // wake published at its run time so the dispatch route fires within seconds,
  // letting the database autosuspend between real work instead of being pinned
  // awake by a minute-by-minute poll. Without a token it degrades to the
  // periodic fallback cron. Publish failures are swallowed (best-effort).
  const qstashToken = process.env.QSTASH_TOKEN?.trim()
  const cronSecret = process.env.CRON_SECRET?.trim()
  const jobScheduler =
    qstashToken && cronSecret
      ? new QStashJobScheduler({
          // QStash is multi-region; QSTASH_URL points at the token's region.
          // Default (qstash.upstash.io) is EU, so a US token needs QSTASH_URL.
          baseUrl:
            process.env.QSTASH_URL?.trim() || 'https://qstash.upstash.io',
          token: qstashToken,
          destinationUrl: `${siteUrl()}/api/v1/internal/dispatch-jobs`,
          forwardAuthorization: `Bearer ${cronSecret}`,
          fetchFn: fetch,
          onError: error =>
            log('warn', 'qstash_schedule_wake_failed', {
              error: error instanceof Error ? error.message : String(error),
            }),
        })
      : new NoopJobScheduler()
  const jobQueue = new OutboxJobQueue(scheduledJobs, ids, clock, jobScheduler)
  const pullCalendarChanges = makePullCalendarChanges({
    calendarConnections,
    calendarEvents,
    provider: googleCalendar,
    ids,
    clock,
  })
  const pushCalendarEvent = makePushCalendarEvent({
    calendarConnections,
    calendarEvents,
    provider: googleCalendar,
    clock,
  })
  const deleteRemoteCalendarEvent = makeDeleteRemoteCalendarEvent({
    calendarConnections,
    provider: googleCalendar,
  })
  const reminderTemplateName = process.env.WHATSAPP_REMINDER_TEMPLATE?.trim()
  const deliverReminder = makeDeliverReminder({
    calendarEvents,
    notifications,
    channelIdentities,
    users,
    emailSender,
    messaging,
    jobQueue,
    ids,
    clock,
    reminderTemplate: reminderTemplateName
      ? {
          name: reminderTemplateName,
          language: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'pt_BR',
        }
      : undefined,
    whatsappSession,
  })
  const watchGoogleCalendar = makeWatchGoogleCalendar({
    calendarConnections,
    provider: googleCalendar,
    clock,
  })
  const calendarWebhookUrl = `${siteUrl()}/api/v1/webhooks/google`
  const enqueueDailyDigests = makeEnqueueDailyDigests({
    users,
    jobQueue,
    clock,
  })
  const reconcileCalendars = makeReconcileCalendars({
    calendarConnections,
    jobQueue,
    clock,
  })
  const renewCalendarChannels = makeRenewCalendarChannels({
    calendarConnections,
    jobQueue,
    clock,
  })
  const dispatchDueJobs = makeDispatchDueJobs({
    scheduledJobs,
    clock,
    logger: {
      error: (message, meta) => log('error', message, meta),
      warn: (message, meta) => log('warn', message, meta),
      info: (message, meta) => log('info', message, meta),
    },
    handlers: {
      [DAILY_DIGEST_JOB]: async payload => {
        await sendDailyDigest(String(payload.userId))
      },
      [CALENDAR_PULL_JOB]: async payload => {
        await pullCalendarChanges(String(payload.userId))
      },
      [CALENDAR_PUSH_JOB]: async payload => {
        await pushCalendarEvent(String(payload.userId), String(payload.eventId))
      },
      [CALENDAR_DELETE_JOB]: async payload => {
        await deleteRemoteCalendarEvent(
          String(payload.userId),
          String(payload.externalId),
          payload.connectionId ? String(payload.connectionId) : undefined,
        )
      },
      [CALENDAR_WATCH_JOB]: async payload => {
        await watchGoogleCalendar(String(payload.userId), calendarWebhookUrl)
      },
      [REMINDER_JOB]: async payload => {
        await deliverReminder(
          String(payload.eventId),
          String(payload.userId),
          Number(payload.minutesBefore),
        )
      },
    },
  })
  const runScheduledFanOut = async () => {
    const [digests, reconciled, renewed] = await Promise.all([
      enqueueDailyDigests(),
      reconcileCalendars(),
      renewCalendarChannels(),
    ])
    return {
      digests: digests.enqueued,
      reconciled: reconciled.enqueued,
      renewed: renewed.enqueued,
    }
  }
  const asaasGateway = new AsaasPaymentGateway()
  const gateways = {
    asaas: asaasGateway,
    stripe: new StripePaymentGateway(),
  }
  const resolvePlan = makeResolvePlanFromSubscription({ subscriptions, clock })
  const consumeCredits = makeConsumeCredits({
    usageMeter,
    ledger: usageEvents,
    resolvePlan,
    ids,
    clock,
  })
  const refundCredits = makeRefundCredits({ usageMeter })
  const entitlementService = new PlanEntitlementService(resolvePlan)
  const createTask = makeCreateTask({ tasks, lists, memberships, ids, clock })
  const updateTask = makeUpdateTask({
    tasks,
    lists,
    memberships,
    users,
    notifications,
    emailSender,
    ids,
    clock,
  })
  const deleteTask = makeDeleteTask({ tasks, lists, memberships })
  const bringTaskToToday = makeBringTaskToToday({
    subtasks,
    lists,
    tasks,
    users,
    ids,
    clock,
    unitOfWork,
  })
  const createList = makeCreateList({ lists, ids, clock })
  const listUserLists = makeListUserLists({ lists, memberships })
  const createSubtask = makeCreateSubtask({
    subtasks,
    tasks,
    lists,
    memberships,
    ids,
    clock,
  })
  const updateSubtask = makeUpdateSubtask({
    subtasks,
    tasks,
    lists,
    memberships,
    clock,
  })
  const listCalendarEvents = makeListCalendarEvents({ calendarEvents })
  const createCalendarEvent = makeCreateCalendarEvent({
    calendarEvents,
    jobQueue,
    ids,
    clock,
  })
  const updateCalendarEvent = makeUpdateCalendarEvent({
    calendarEvents,
    jobQueue,
    clock,
  })
  const deleteCalendarEvent = makeDeleteCalendarEvent({
    calendarEvents,
    jobQueue,
    clock,
  })
  const updateCalendarOccurrence = makeUpdateCalendarOccurrence({
    calendarEvents,
    jobQueue,
    ids,
    clock,
  })
  const deleteCalendarOccurrence = makeDeleteCalendarOccurrence({
    calendarEvents,
    jobQueue,
    ids,
    clock,
  })
  // The assistant emits offset-aware local ISO (e.g. ...-03:00); the calendar
  // use cases validate strict UTC (`z.string().datetime()`). Normalize to the
  // same instant in UTC before handing off.
  const toUtcIso = (value: string): string => new Date(value).toISOString()

  const weatherProvider = new OpenMeteoWeatherProvider()

  const assistantTools: AssistantTools = {
    async getContext(userId) {
      const user = await users.findById(asEntityId(userId))
      const timezone = user?.timezone ?? DEFAULT_TIME_ZONE
      const now = clock.now()
      return {
        timezone,
        nowIso: zonedIso(now, timezone),
        weekday: zonedWeekday(now, timezone),
        defaultWeatherLocation: user?.weatherLocation ?? null,
      }
    },
    async getToday(userId) {
      const user = await users.findById(asEntityId(userId))
      const date = civilDate(clock.now(), user?.timezone ?? DEFAULT_TIME_ZONE)
      const board = await getDailyBoard(userId, date)
      return {
        tasks: board.tasks.map(task => ({
          id: task.id,
          title: task.title,
          status: task.status,
        })),
      }
    },
    async getLists(userId) {
      const page = await listUserLists(userId, {
        type: null,
        limit: 100,
        cursor: null,
      })
      return {
        lists: page.items.map(list => ({ id: list.id, title: list.title })),
      }
    },
    async getAgenda(userId, range) {
      const user = await users.findById(asEntityId(userId))
      const timezone = user?.timezone ?? DEFAULT_TIME_ZONE
      const now = clock.now()
      const DAY_MS = 24 * 60 * 60 * 1000
      const parseOr = (value: string | undefined, fallback: Date): Date => {
        if (!value) return fallback
        const parsed = new Date(value)
        return Number.isNaN(parsed.getTime()) ? fallback : parsed
      }
      const from = parseOr(range?.from, now)
      // Default to a 30-day look-ahead; cap the window at 180 days so a wide
      // request can't pull an unbounded number of recurring occurrences.
      const to = parseOr(range?.to, new Date(from.getTime() + 30 * DAY_MS))
      const cappedTo = new Date(
        Math.min(to.getTime(), from.getTime() + 180 * DAY_MS),
      )
      const events = await listCalendarEvents(userId, {
        from: from.toISOString(),
        to: cappedTo.toISOString(),
      })
      return {
        // Times go out in the user's zone (with offset) so the model reads and
        // echoes local wall-clock times, not UTC. seriesId/occurrenceStart let
        // it target one occurrence of a recurring series.
        events: events.map(event => ({
          id: event.id,
          title: event.title,
          startsAt: zonedIso(new Date(event.startsAt), timezone),
          endsAt: zonedIso(new Date(event.endsAt), timezone),
          seriesId: event.seriesId,
          occurrenceStart: event.occurrenceStart,
        })),
      }
    },
    async getWeather(query) {
      return weatherProvider.getForecast(query)
    },
    async setDefaultWeatherLocation(userId, location) {
      const user = await users.findById(asEntityId(userId))
      if (!user) return { ok: false, location: null }
      user.setWeatherLocation(location)
      await users.save(user)
      return { ok: true, location: user.weatherLocation }
    },
    async addTask(userId, input) {
      let listId = input.listId
      if (!listId) {
        const user = await users.findById(asEntityId(userId))
        const date = civilDate(clock.now(), user?.timezone ?? DEFAULT_TIME_ZONE)
        const board = await getDailyBoard(userId, date)
        listId = board.list.id
      }
      const task = await createTask(userId, { listId, title: input.title })
      return { id: task.id, added: true }
    },
    async completeTask(userId, taskId) {
      await updateTask(userId, taskId, { status: 'completed' })
      return { ok: true }
    },
    async reopenTask(userId, taskId) {
      await updateTask(userId, taskId, { status: 'pending' })
      return { ok: true }
    },
    async renameTask(userId, taskId, title) {
      await updateTask(userId, taskId, { title })
      return { ok: true }
    },
    async deleteTask(userId, taskId) {
      await deleteTask(userId, taskId)
      return { ok: true }
    },
    async moveTaskToToday(userId, taskId) {
      await bringTaskToToday(userId, taskId)
      return { ok: true }
    },
    async createList(userId, title) {
      const list = await createList(userId, { title })
      return { id: list.id }
    },
    async addSubtask(userId, taskId, title) {
      const subtask = await createSubtask(userId, taskId, { title })
      return { id: subtask.id }
    },
    async completeSubtask(userId, subtaskId) {
      await updateSubtask(userId, subtaskId, { status: 'completed' })
      return { ok: true }
    },
    async addEvent(userId, input) {
      const event = await createCalendarEvent(userId, {
        title: input.title,
        startsAt: toUtcIso(input.startsAt),
        endsAt: toUtcIso(input.endsAt),
        description: input.description ?? null,
        location: input.location ?? null,
        allDay: input.allDay,
        // Default a reminder when the assistant did not set one, so an event
        // created over WhatsApp actually schedules a heads-up instead of
        // silently relying on the calendar provider's own default reminders.
        reminders: input.reminders?.length
          ? input.reminders
          : [ASSISTANT_DEFAULT_REMINDER_MINUTES],
      })
      return { id: event.id, added: true }
    },
    async updateEvent(userId, eventId, input) {
      await updateCalendarEvent(userId, eventId, {
        ...input,
        ...(input.startsAt ? { startsAt: toUtcIso(input.startsAt) } : {}),
        ...(input.endsAt ? { endsAt: toUtcIso(input.endsAt) } : {}),
      })
      return { ok: true }
    },
    async rescheduleOccurrence(userId, input) {
      await updateCalendarOccurrence(userId, input.seriesId, {
        occurrenceStart: toUtcIso(input.occurrenceStart),
        title: input.title,
        startsAt: toUtcIso(input.startsAt),
        endsAt: toUtcIso(input.endsAt),
      })
      return { ok: true }
    },
    async cancelOccurrence(userId, input) {
      await deleteCalendarOccurrence(
        userId,
        input.seriesId,
        toUtcIso(input.occurrenceStart),
      )
      return { ok: true }
    },
    async deleteEvent(userId, eventId) {
      await deleteCalendarEvent(userId, eventId)
      return { ok: true }
    },
  }
  const agent = createAgentRunner(assistantTools)
  return {
    createTask,
    updateTask,
    deleteTask,
    listListTasks: makeListListTasks({ tasks, subtasks, lists, memberships }),
    createSubtask,
    listSubtasks: makeListSubtasks({ subtasks, tasks, lists, memberships }),
    updateSubtask,
    deleteSubtask: makeDeleteSubtask({ subtasks, tasks, lists, memberships }),
    reorderSubtasks: makeReorderSubtasks({
      subtasks,
      tasks,
      lists,
      memberships,
      unitOfWork,
    }),
    createGuestUser: makeCreateGuestUser({ users, ids, clock }),
    getUser: makeGetUser({ users }),
    registerWithEmail: makeRegisterWithEmail({
      users,
      emailVerifications,
      hasher,
      codes,
      emailSender,
      ids,
      clock,
      unitOfWork,
    }),
    requestEmailVerification: makeRequestEmailVerification({
      users,
      emailVerifications,
      hasher,
      codes,
      emailSender,
      ids,
      clock,
      unitOfWork,
    }),
    verifyEmail: makeVerifyEmail({ users, emailVerifications, hasher, clock }),
    signInWithEmail: makeSignInWithEmail({ users, hasher }),
    signInWithGoogle: makeSignInWithGoogle({ users, oauth, ids, clock }),
    getGoogleAuthUrl: makeGetGoogleAuthUrl({ oauth }),
    changePassword: makeChangePassword({ users, hasher }),
    renameUser: makeRenameUser({ users }),
    deleteUser: makeDeleteUser({ users, conversations }),
    exportUserData: makeExportUserData({
      users,
      lists,
      tasks,
      recurringTasks,
      shareLinks,
      notifications,
      apiKeys,
      subscriptions,
      calendarEvents,
      channelIdentities,
    }),
    createList,
    renameList: makeRenameList({ lists, clock }),
    deleteList: makeDeleteList({ lists }),
    reorderTasks: makeReorderTasks({ tasks, lists, memberships, unitOfWork }),
    getList: makeGetList({ lists, memberships }),
    listUserLists,
    getDailyBoard,
    bringTaskToToday,
    setCarryOverMode: makeSetCarryOverMode({ users }),
    setReminderPreferences: makeSetReminderPreferences({ users }),
    setTimezone: makeSetTimezone({ users }),
    setWeatherLocation: makeSetWeatherLocation({ users }),
    previewWeatherLocation: makePreviewWeatherLocation({
      weather: weatherProvider,
    }),
    setAvatar: makeSetAvatar({ users, fileStorage }),
    removeAvatar: makeRemoveAvatar({ users, fileStorage }),
    createRecurringTask: makeCreateRecurringTask({
      recurringTasks,
      ids,
      clock,
    }),
    listRecurringTasks: makeListRecurringTasks({ recurringTasks }),
    updateRecurringTask: makeUpdateRecurringTask({ recurringTasks }),
    deleteRecurringTask: makeDeleteRecurringTask({ recurringTasks }),
    createShareLink: makeCreateShareLink({
      shareLinks,
      lists,
      tokens,
      ids,
      clock,
    }),
    inviteToList: makeInviteToList({
      shareLinks,
      lists,
      tokens,
      ids,
      clock,
      emailSender,
      unitOfWork,
    }),
    listShareLinks: makeListShareLinks({ shareLinks, lists }),
    revokeShareLink: makeRevokeShareLink({ shareLinks, lists }),
    getSharedBoard: makeGetSharedBoard({
      shareLinks,
      lists,
      tasks,
      subtasks,
      clock,
    }),
    joinListByToken: makeJoinListByToken({
      shareLinks,
      lists,
      memberships,
      users,
      ids,
      clock,
      unitOfWork,
    }),
    listMembers: makeListMembers({ lists, memberships, users }),
    removeMember: makeRemoveMember({ lists, memberships }),
    leaveList: makeLeaveList({ lists, memberships }),
    getAnalytics: makeGetAnalytics({ analytics, users, clock }),
    generateList: makeGenerateList({ generator: listGenerator }),
    sendDailyDigest,
    listNotifications: makeListNotifications({ notifications }),
    markNotificationRead: makeMarkNotificationRead({ notifications, clock }),
    markAllNotificationsRead: makeMarkAllNotificationsRead({
      notifications,
      clock,
    }),
    createApiKey: makeCreateApiKey({
      apiKeys,
      hasher: keyHasher,
      tokens,
      ids,
      clock,
    }),
    listApiKeys: makeListApiKeys({ apiKeys }),
    revokeApiKey: makeRevokeApiKey({ apiKeys, clock }),
    authenticateApiKey: makeAuthenticateApiKey({
      apiKeys,
      hasher: keyHasher,
      clock,
    }),
    checkHealth: makeCheckHealth({
      probes: healthProbes,
      clock,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
    }),
    dispatchDueJobs,
    startCheckout: makeStartCheckout({
      gateways,
      checkoutIntents,
      ids,
      clock,
    }),
    handleSubscriptionWebhook: makeHandleSubscriptionWebhook({
      gateways,
      subscriptions,
      checkoutIntents,
      ids,
      clock,
    }),
    startLocalCheckout: makeStartLocalCheckout({
      gateway: asaasGateway,
      users,
      billingCustomers,
      checkoutIntents,
      ids,
      clock,
    }),
    getSubscription: makeGetSubscription({ subscriptions }),
    cancelSubscription: makeCancelSubscription({
      gateways,
      subscriptions,
      clock,
    }),
    consumeCredits,
    refundCredits,
    getUsage: makeGetUsage({ usageMeter, resolvePlan }),
    createCalendarEvent,
    updateCalendarEvent,
    updateCalendarOccurrence,
    deleteCalendarEvent,
    deleteCalendarOccurrence,
    listCalendarEvents,
    getCalendarEvent: makeGetCalendarEvent({ calendarEvents }),
    connectGoogleCalendar: makeConnectGoogleCalendar({
      calendarConnections,
      provider: googleCalendar,
      ids,
      clock,
    }),
    listCalendarConnections: makeListCalendarConnections({
      calendarConnections,
    }),
    disconnectCalendar: makeDisconnectCalendar({
      calendarConnections,
      calendarEvents,
      clock,
    }),
    setDefaultCalendar: makeSetDefaultCalendar({
      calendarConnections,
      clock,
    }),
    pullCalendarChanges,
    pushCalendarEvent,
    watchGoogleCalendar,
    handleCalendarNotification: makeHandleCalendarNotification({
      calendarConnections,
      jobQueue,
      clock,
    }),
    googleCalendarAuthUrl: (state: string) => googleCalendar.authUrl(state),
    runScheduledFanOut,
    startWhatsappPairing: makeStartWhatsappPairing({
      channelIdentities,
      codes,
      ids,
      clock,
    }),
    getWhatsappChannel: makeGetWhatsappChannel({ channelIdentities }),
    handleInboundWhatsApp: makeHandleInboundWhatsApp({
      channelIdentities,
      users,
      messaging,
      entitlements: entitlementService,
      consumeCredits,
      refundCredits,
      agent,
      conversations,
      transcriber,
      visionReader,
      clock,
      logger: {
        error: (message, meta) => log('error', message, meta),
        warn: (message, meta) => log('warn', message, meta),
        info: (message, meta) => log('info', message, meta),
      },
      whatsappSession,
    }),
    entitlements: entitlementService,
  }
}

function buildListGenerator(): ListGenerator {
  // Prefer a direct Gemini key (no AI Gateway credits required); fall back to
  // an AI Gateway model string, then to the offline stub.
  const geminiKey = process.env.GEMINI_API_KEY?.trim()
  if (geminiKey) {
    return createGoogleListGenerator({
      apiKey: geminiKey,
      modelId: process.env.GEMINI_MODEL_ID?.trim() || undefined,
    })
  }
  const model = process.env.AI_MODEL?.trim()
  if (model) {
    return new AiSdkListGenerator(model)
  }
  return new StubListGenerator()
}

function buildHealthProbes(): HealthProbe[] {
  const probes: HealthProbe[] = [new PrismaHealthProbe(prisma)]
  const redisProbe = createRedisHealthProbe()
  if (redisProbe) {
    probes.push(redisProbe)
  }
  return probes
}

function buildEmailSender(): EmailSender {
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    const from =
      process.env.EMAIL_FROM ?? `${SITE_NAME} <onboarding@resend.dev>`
    return new ResendEmailSender(apiKey, from, SITE_NAME)
  }
  return new ConsoleEmailSender()
}

function buildGoogleProvider(): GoogleOAuthProvider {
  return new GoogleOAuthProvider({
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ??
      `${siteUrl()}/api/v1/auth/google/callback`,
  })
}

export function googleCalendarRedirectUri(): string {
  return (
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ??
    `${siteUrl()}/api/v1/calendar/google/callback`
  )
}

function buildGoogleCalendarProvider(): GoogleCalendarProvider {
  return new GoogleCalendarProvider({
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    redirectUri: googleCalendarRedirectUri(),
  })
}

let container: Container | null = null

export function getContainer(): Container {
  if (!container) {
    const db = createTransactionalClient(prisma)
    container = build(
      {
        tasks: new PrismaTaskRepository(db),
        subtasks: new PrismaSubtaskRepository(db),
        users: new PrismaUserRepository(db),
        lists: new PrismaListRepository(db),
        recurringTasks: new PrismaRecurringTaskRepository(db),
        shareLinks: new PrismaShareLinkRepository(db),
        memberships: new PrismaMembershipRepository(db),
        emailVerifications: new PrismaEmailVerificationRepository(db),
        analytics: new PrismaAnalyticsRepository(db),
        notifications: new PrismaNotificationRepository(db),
        apiKeys: new PrismaApiKeyRepository(db),
        scheduledJobs: new PrismaScheduledJobRepository(db),
        subscriptions: new PrismaSubscriptionRepository(db),
        checkoutIntents: new PrismaCheckoutIntentRepository(db),
        billingCustomers: new PrismaBillingCustomerRepository(db),
        usageEvents: new PrismaUsageEventRepository(db),
        calendarEvents: new PrismaCalendarEventRepository(db),
        calendarConnections: new PrismaCalendarConnectionRepository(db),
        channelIdentities: new PrismaChannelIdentityRepository(db),
      },
      {
        hasher: new Argon2PasswordHasher(new ScryptPasswordHasher()),
        keyHasher: new Sha256KeyHasher(),
        emailSender: buildEmailSender(),
        oauth: buildGoogleProvider(),
        listGenerator: buildListGenerator(),
        healthProbes: buildHealthProbes(),
        fileStorage: new VercelBlobStorage(),
        usageMeter: createUsageMeter(),
        googleCalendar: buildGoogleCalendarProvider(),
        messaging: createMessagingChannel(),
        conversations: createConversationStore(),
        whatsappSession: createWhatsappSessionWindow(),
        transcriber: createTranscriber(),
        visionReader: createVisionReader(),
      },
      new PrismaUnitOfWork(prisma),
    )
  }
  return container
}
