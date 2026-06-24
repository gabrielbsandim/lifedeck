import {
  makeAuthenticateApiKey,
  makeBringTaskToToday,
  makeChangePassword,
  makeCreateApiKey,
  makeCreateGuestUser,
  makeCreateList,
  makeDeleteList,
  makeDeleteTask,
  makeLeaveList,
  makeRenameList,
  makeReorderTasks,
  makeCreateRecurringTask,
  makeCreateShareLink,
  makeCreateTask,
  makeDeleteRecurringTask,
  makeDeleteUser,
  makeCheckHealth,
  makeExportUserData,
  makeGenerateList,
  makeGetAnalytics,
  makeGetDailyBoard,
  makeGetGoogleAuthUrl,
  makeGetList,
  makeGetSharedBoard,
  makeGetUser,
  makeInviteToList,
  makeJoinListByToken,
  makeListApiKeys,
  makeListListTasks,
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
  makeRevokeApiKey,
  makeRevokeShareLink,
  makeSendDailyDigest,
  makeSetCarryOverMode,
  makeSetTimezone,
  makeSetAvatar,
  makeRemoveAvatar,
  makeSignInWithEmail,
  makeSignInWithGoogle,
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
  type ShareLinkRepository,
  type TaskRepository,
  type UnitOfWork,
  type UserRepository,
  type FileStorage,
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
  PrismaShareLinkRepository,
  PrismaTaskRepository,
  PrismaUserRepository,
  Argon2PasswordHasher,
  RandomTokenGenerator,
  ResendEmailSender,
  ScryptPasswordHasher,
  Sha256KeyHasher,
  StubListGenerator,
  SystemClock,
  UuidGenerator,
  PrismaUnitOfWork,
  VercelBlobStorage,
  createTransactionalClient,
  prisma,
} from '@lifedeck/infrastructure'
import { createRedisHealthProbe } from '@/server/api/redis-health-probe'
import { siteUrl } from '@/lib/site'

type Container = {
  createTask: ReturnType<typeof makeCreateTask>
  updateTask: ReturnType<typeof makeUpdateTask>
  deleteTask: ReturnType<typeof makeDeleteTask>
  listListTasks: ReturnType<typeof makeListListTasks>
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
  setTimezone: ReturnType<typeof makeSetTimezone>
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
}

type Repositories = {
  tasks: TaskRepository
  users: UserRepository
  lists: ListRepository
  recurringTasks: RecurringTaskRepository
  shareLinks: ShareLinkRepository
  memberships: MembershipRepository
  emailVerifications: EmailVerificationRepository
  analytics: AnalyticsRepository
  notifications: NotificationRepository
  apiKeys: ApiKeyRepository
}

type Services = {
  hasher: PasswordHasher
  keyHasher: KeyHasher
  emailSender: EmailSender
  oauth: OAuthProvider
  listGenerator: ListGenerator
  healthProbes: HealthProbe[]
  fileStorage: FileStorage
}

function build(
  {
    tasks,
    users,
    lists,
    recurringTasks,
    shareLinks,
    memberships,
    emailVerifications,
    analytics,
    notifications,
    apiKeys,
  }: Repositories,
  {
    hasher,
    keyHasher,
    emailSender,
    oauth,
    listGenerator,
    healthProbes,
    fileStorage,
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
    recurringTasks,
    users,
    ids,
    clock,
    unitOfWork,
  })
  return {
    createTask: makeCreateTask({ tasks, lists, memberships, ids, clock }),
    updateTask: makeUpdateTask({
      tasks,
      lists,
      memberships,
      users,
      notifications,
      emailSender,
      ids,
      clock,
    }),
    deleteTask: makeDeleteTask({ tasks, lists, memberships }),
    listListTasks: makeListListTasks({ tasks, lists, memberships }),
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
    deleteUser: makeDeleteUser({ users }),
    exportUserData: makeExportUserData({
      users,
      lists,
      tasks,
      recurringTasks,
      shareLinks,
      notifications,
      apiKeys,
    }),
    createList: makeCreateList({ lists, ids, clock }),
    renameList: makeRenameList({ lists, clock }),
    deleteList: makeDeleteList({ lists }),
    reorderTasks: makeReorderTasks({ tasks, lists, memberships, unitOfWork }),
    getList: makeGetList({ lists, memberships }),
    listUserLists: makeListUserLists({ lists, memberships }),
    getDailyBoard,
    bringTaskToToday: makeBringTaskToToday({
      lists,
      tasks,
      users,
      ids,
      clock,
      unitOfWork,
    }),
    setCarryOverMode: makeSetCarryOverMode({ users }),
    setTimezone: makeSetTimezone({ users }),
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
    getSharedBoard: makeGetSharedBoard({ shareLinks, lists, tasks, clock }),
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
    sendDailyDigest: makeSendDailyDigest({
      getDailyBoard,
      users,
      emailSender,
      clock,
    }),
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
    const from = process.env.EMAIL_FROM ?? 'Lifedeck <onboarding@resend.dev>'
    return new ResendEmailSender(apiKey, from)
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

let container: Container | null = null

export function getContainer(): Container {
  if (!container) {
    const db = createTransactionalClient(prisma)
    container = build(
      {
        tasks: new PrismaTaskRepository(db),
        users: new PrismaUserRepository(db),
        lists: new PrismaListRepository(db),
        recurringTasks: new PrismaRecurringTaskRepository(db),
        shareLinks: new PrismaShareLinkRepository(db),
        memberships: new PrismaMembershipRepository(db),
        emailVerifications: new PrismaEmailVerificationRepository(db),
        analytics: new PrismaAnalyticsRepository(db),
        notifications: new PrismaNotificationRepository(db),
        apiKeys: new PrismaApiKeyRepository(db),
      },
      {
        hasher: new Argon2PasswordHasher(new ScryptPasswordHasher()),
        keyHasher: new Sha256KeyHasher(),
        emailSender: buildEmailSender(),
        oauth: buildGoogleProvider(),
        listGenerator: buildListGenerator(),
        healthProbes: buildHealthProbes(),
        fileStorage: new VercelBlobStorage(),
      },
      new PrismaUnitOfWork(prisma),
    )
  }
  return container
}
