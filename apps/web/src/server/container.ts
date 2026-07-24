import {
  makeAssistantTools,
  makeAuthenticateApiKey,
  makeBringTaskToToday,
  makeChangePassword,
  makeConnectGoogleCalendar,
  makeConnectCalendarWithCredentials,
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
  makeSendProactiveMessage,
  makeEnqueueDailyDigests,
  makeEnqueueDailyBriefs,
  makeSendDailyBrief,
  makeEnqueueHabitCheckins,
  makeSendHabitCheckin,
  makeEnqueueNudges,
  makeSendNudge,
  makeCreateHabit,
  makeListHabits,
  makeUpdateHabit,
  makeDeleteHabit,
  makeLogHabit,
  makeEnqueueReminderBackfill,
  makeReconcileCalendars,
  makeRenewCalendarChannels,
  makeStartWhatsappPairing,
  makeGetWhatsappChannel,
  makeHandleInboundWhatsApp,
  makeHandleInAppMessage,
  makeHandleCalendarNotification,
  makePullCalendarChanges,
  makePushCalendarEvent,
  makeWatchGoogleCalendar,
  CALENDAR_PULL_JOB,
  CALENDAR_PUSH_JOB,
  CALENDAR_DELETE_JOB,
  CALENDAR_WATCH_JOB,
  DAILY_DIGEST_JOB,
  DAILY_BRIEF_JOB,
  HABIT_CHECKIN_JOB,
  NUDGE_JOB,
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
  makeFindFreeSlots,
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
  makeSetAssistantProfile,
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
  type HabitRepository,
  type HabitLogRepository,
  type NudgeLogRepository,
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
  type CalendarProviderRegistry,
  type ChannelIdentityRepository,
  type MessagingChannel,
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
  PrismaHabitRepository,
  PrismaHabitLogRepository,
  PrismaNudgeLogRepository,
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
  AppleCalendarProvider,
  CalcomCalendarProvider,
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
  createProactiveSendGuard,
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
  setAssistantProfile: ReturnType<typeof makeSetAssistantProfile>
  setAvatar: ReturnType<typeof makeSetAvatar>
  removeAvatar: ReturnType<typeof makeRemoveAvatar>
  createRecurringTask: ReturnType<typeof makeCreateRecurringTask>
  listRecurringTasks: ReturnType<typeof makeListRecurringTasks>
  updateRecurringTask: ReturnType<typeof makeUpdateRecurringTask>
  deleteRecurringTask: ReturnType<typeof makeDeleteRecurringTask>
  createHabit: ReturnType<typeof makeCreateHabit>
  listHabits: ReturnType<typeof makeListHabits>
  updateHabit: ReturnType<typeof makeUpdateHabit>
  deleteHabit: ReturnType<typeof makeDeleteHabit>
  logHabit: ReturnType<typeof makeLogHabit>
  sendHabitCheckin: ReturnType<typeof makeSendHabitCheckin>
  sendNudge: ReturnType<typeof makeSendNudge>
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
  sendDailyBrief: ReturnType<typeof makeSendDailyBrief>
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
  findFreeSlots: ReturnType<typeof makeFindFreeSlots>
  getCalendarEvent: ReturnType<typeof makeGetCalendarEvent>
  connectGoogleCalendar: ReturnType<typeof makeConnectGoogleCalendar>
  connectCalendarWithCredentials: ReturnType<
    typeof makeConnectCalendarWithCredentials
  >
  listCalendarConnections: ReturnType<typeof makeListCalendarConnections>
  disconnectCalendar: ReturnType<typeof makeDisconnectCalendar>
  setDefaultCalendar: ReturnType<typeof makeSetDefaultCalendar>
  pullCalendarChanges: ReturnType<typeof makePullCalendarChanges>
  enqueueReminderBackfill: ReturnType<typeof makeEnqueueReminderBackfill>
  pushCalendarEvent: ReturnType<typeof makePushCalendarEvent>
  watchGoogleCalendar: ReturnType<typeof makeWatchGoogleCalendar>
  handleCalendarNotification: ReturnType<typeof makeHandleCalendarNotification>
  googleCalendarAuthUrl: (state: string) => string
  runScheduledFanOut: () => Promise<{
    digests: number
    briefs: number
    checkins: number
    nudges: number
    reconciled: number
    renewed: number
  }>
  startWhatsappPairing: ReturnType<typeof makeStartWhatsappPairing>
  getWhatsappChannel: ReturnType<typeof makeGetWhatsappChannel>
  handleInboundWhatsApp: ReturnType<typeof makeHandleInboundWhatsApp>
  handleInAppMessage: ReturnType<typeof makeHandleInAppMessage>
  entitlements: EntitlementService
}

type Repositories = {
  tasks: TaskRepository
  subtasks: SubtaskRepository
  users: UserRepository
  lists: ListRepository
  recurringTasks: RecurringTaskRepository
  habits: HabitRepository
  habitLogs: HabitLogRepository
  nudgeLogs: NudgeLogRepository
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
  appleCalendar: CalendarProvider
  calcomCalendar: CalendarProvider
  messaging: MessagingChannel
  conversations: ConversationStore
  whatsappSession: WhatsappSessionWindow
  transcriber: Transcriber
  visionReader: VisionReader
}

function build(
  {
    tasks,
    subtasks,
    users,
    lists,
    recurringTasks,
    habits,
    habitLogs,
    nudgeLogs,
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
    appleCalendar,
    calcomCalendar,
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
  // One adapter per provider; sync use cases resolve by connection.provider so a
  // user's Google, Apple, and cal.com calendars all flow through one path.
  const calendarProviders: CalendarProviderRegistry = {
    get(provider) {
      if (provider === 'google') return googleCalendar
      if (provider === 'apple') return appleCalendar
      if (provider === 'calcom') return calcomCalendar
      throw new Error(`No calendar provider registered for "${provider}".`)
    },
  }
  const connectCalendarWithCredentials = makeConnectCalendarWithCredentials({
    calendarConnections,
    providers: calendarProviders,
    ids,
    clock,
  })
  const pullCalendarChanges = makePullCalendarChanges({
    calendarConnections,
    calendarEvents,
    providers: calendarProviders,
    jobQueue,
    ids,
    clock,
  })
  const pushCalendarEvent = makePushCalendarEvent({
    calendarConnections,
    calendarEvents,
    providers: calendarProviders,
    clock,
  })
  const deleteRemoteCalendarEvent = makeDeleteRemoteCalendarEvent({
    calendarConnections,
    providers: calendarProviders,
  })
  // Single path for assistant-initiated WhatsApp; V3's brief/nudge/check-in
  // reuse it. Reminders delegate their WhatsApp delivery here.
  const sendProactiveMessage = makeSendProactiveMessage({
    channelIdentities,
    messaging,
    whatsappSession,
    logger: {
      error: (message, meta) => log('error', message, meta),
      warn: (message, meta) => log('warn', message, meta),
      info: (message, meta) => log('info', message, meta),
    },
  })
  const reminderTemplateName = process.env.WHATSAPP_REMINDER_TEMPLATE?.trim()
  const deliverReminder = makeDeliverReminder({
    calendarEvents,
    notifications,
    users,
    emailSender,
    sendProactiveMessage,
    jobQueue,
    ids,
    clock,
    reminderTemplate: reminderTemplateName
      ? {
          name: reminderTemplateName,
          language: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'pt_BR',
        }
      : undefined,
  })
  const watchGoogleCalendar = makeWatchGoogleCalendar({
    calendarConnections,
    providers: calendarProviders,
    clock,
  })
  const calendarWebhookUrl = `${siteUrl()}/api/v1/webhooks/google`
  const enqueueDailyDigests = makeEnqueueDailyDigests({
    users,
    jobQueue,
    clock,
  })
  const enqueueDailyBriefs = makeEnqueueDailyBriefs({
    users,
    jobQueue,
    clock,
  })
  const enqueueHabitCheckins = makeEnqueueHabitCheckins({
    habits,
    users,
    jobQueue,
    clock,
  })
  const nudgeHour = Number(process.env.NUDGE_HOUR?.trim()) || 18
  const enqueueNudges = makeEnqueueNudges({
    users,
    jobQueue,
    clock,
    nudgeHour,
  })
  const reconcileCalendars = makeReconcileCalendars({
    calendarConnections,
    jobQueue,
    clock,
  })
  const enqueueReminderBackfill = makeEnqueueReminderBackfill({
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
      [DAILY_BRIEF_JOB]: async payload => {
        await sendDailyBrief(String(payload.userId))
      },
      [HABIT_CHECKIN_JOB]: async payload => {
        await sendHabitCheckin(String(payload.userId), String(payload.habitId))
      },
      [NUDGE_JOB]: async payload => {
        await sendNudge(String(payload.userId))
      },
      [CALENDAR_PULL_JOB]: async payload => {
        await pullCalendarChanges(String(payload.userId), {
          force: payload.force === true,
        })
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
    const [digests, briefs, checkins, nudges, reconciled, renewed] =
      await Promise.all([
        enqueueDailyDigests(),
        enqueueDailyBriefs(),
        enqueueHabitCheckins(),
        enqueueNudges(),
        reconcileCalendars(),
        renewCalendarChannels(),
      ])
    return {
      digests: digests.enqueued,
      briefs: briefs.enqueued,
      checkins: checkins.enqueued,
      nudges: nudges.enqueued,
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
  const findFreeSlots = makeFindFreeSlots({ users, listCalendarEvents, clock })
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
  const weatherProvider = new OpenMeteoWeatherProvider()
  const setAssistantProfile = makeSetAssistantProfile({ users })
  const proactiveDailyCap = Number(process.env.PROACTIVE_DAILY_CAP?.trim()) || 3
  const proactiveSendGuard = createProactiveSendGuard(proactiveDailyCap)
  const briefTemplateName = process.env.WHATSAPP_TEMPLATE_DAILY_BRIEF?.trim()
  const sendDailyBrief = makeSendDailyBrief({
    users,
    entitlements: entitlementService,
    getDailyBoard,
    listCalendarEvents,
    weather: weatherProvider,
    sendProactiveMessage,
    sendGuard: proactiveSendGuard,
    clock,
    briefTemplate: briefTemplateName
      ? {
          name: briefTemplateName,
          language: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'pt_BR',
        }
      : undefined,
  })

  const createHabit = makeCreateHabit({
    habits,
    users,
    entitlements: entitlementService,
    ids,
    clock,
  })
  const listHabits = makeListHabits({ habits, habitLogs, users, clock })
  const updateHabit = makeUpdateHabit({ habits, habitLogs, users, clock })
  const deleteHabit = makeDeleteHabit({ habits })
  const logHabit = makeLogHabit({ habits, habitLogs, users, ids, clock })
  const checkinTemplateName =
    process.env.WHATSAPP_TEMPLATE_HABIT_CHECKIN?.trim()
  const sendHabitCheckin = makeSendHabitCheckin({
    habits,
    habitLogs,
    users,
    entitlements: entitlementService,
    sendProactiveMessage,
    sendGuard: proactiveSendGuard,
    clock,
    checkinTemplate: checkinTemplateName
      ? {
          name: checkinTemplateName,
          language: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'pt_BR',
        }
      : undefined,
  })
  const nudgeTemplateName = process.env.WHATSAPP_TEMPLATE_NUDGE?.trim()
  const sendNudge = makeSendNudge({
    users,
    entitlements: entitlementService,
    getDailyBoard,
    nudgeLogs,
    sendProactiveMessage,
    sendGuard: proactiveSendGuard,
    conversations,
    ids,
    clock,
    nudgeTemplate: nudgeTemplateName
      ? {
          name: nudgeTemplateName,
          language: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'pt_BR',
        }
      : undefined,
  })

  const assistantTools = makeAssistantTools({
    users,
    clock,
    weather: weatherProvider,
    getDailyBoard,
    listUserLists,
    listCalendarEvents,
    findFreeSlots,
    createTask,
    updateTask,
    deleteTask,
    bringTaskToToday,
    createList,
    createSubtask,
    updateSubtask,
    createCalendarEvent,
    updateCalendarEvent,
    updateCalendarOccurrence,
    deleteCalendarOccurrence,
    deleteCalendarEvent,
    setAssistantProfile,
    createHabit,
    listHabits,
    logHabit,
  })
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
    setAssistantProfile,
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
    createHabit,
    listHabits,
    updateHabit,
    deleteHabit,
    logHabit,
    sendHabitCheckin,
    sendNudge,
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
    getAnalytics: makeGetAnalytics({
      analytics,
      habits,
      habitLogs,
      users,
      clock,
    }),
    generateList: makeGenerateList({ generator: listGenerator }),
    sendDailyDigest,
    sendDailyBrief,
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
    findFreeSlots,
    getCalendarEvent: makeGetCalendarEvent({ calendarEvents }),
    connectGoogleCalendar: makeConnectGoogleCalendar({
      calendarConnections,
      provider: googleCalendar,
      ids,
      clock,
    }),
    connectCalendarWithCredentials,
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
    enqueueReminderBackfill,
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
    handleInAppMessage: makeHandleInAppMessage({
      entitlements: entitlementService,
      consumeCredits,
      refundCredits,
      agent,
      conversations,
      transcriber,
      visionReader,
      logger: {
        error: (message, meta) => log('error', message, meta),
        warn: (message, meta) => log('warn', message, meta),
        info: (message, meta) => log('info', message, meta),
      },
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
        habits: new PrismaHabitRepository(db),
        habitLogs: new PrismaHabitLogRepository(db),
        nudgeLogs: new PrismaNudgeLogRepository(db),
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
        appleCalendar: new AppleCalendarProvider({
          baseUrl: process.env.APPLE_CALDAV_BASE_URL?.trim() || undefined,
        }),
        calcomCalendar: new CalcomCalendarProvider({
          apiBaseUrl: process.env.CALCOM_API_BASE_URL?.trim() || undefined,
        }),
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
