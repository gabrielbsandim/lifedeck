import {
  makeAuthenticateApiKey,
  makeChangePassword,
  makeCreateApiKey,
  makeCreateGuestUser,
  makeCreateList,
  makeDeleteList,
  makeRenameList,
  makeReorderTasks,
  makeCreateRecurringTask,
  makeCreateShareLink,
  makeCreateTask,
  makeDeleteRecurringTask,
  makeDeleteUser,
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
  type ListGenerator,
  type ListRepository,
  type MembershipRepository,
  type NotificationRepository,
  type OAuthProvider,
  type PasswordHasher,
  type RecurringTaskRepository,
  type ShareLinkRepository,
  type TaskRepository,
  type UserRepository,
} from '@taskin/application'
import {
  AiSdkListGenerator,
  ConsoleEmailSender,
  GoogleOAuthProvider,
  NumericCodeGenerator,
  PrismaAnalyticsRepository,
  PrismaApiKeyRepository,
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
  prisma,
} from '@taskin/infrastructure'

type Container = {
  createTask: ReturnType<typeof makeCreateTask>
  updateTask: ReturnType<typeof makeUpdateTask>
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
  { hasher, keyHasher, emailSender, oauth, listGenerator }: Services,
): Container {
  const clock = new SystemClock()
  const ids = new UuidGenerator()
  const tokens = new RandomTokenGenerator()
  const codes = new NumericCodeGenerator()
  const getDailyBoard = makeGetDailyBoard({
    lists,
    tasks,
    recurringTasks,
    ids,
    clock,
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
    }),
    requestEmailVerification: makeRequestEmailVerification({
      users,
      emailVerifications,
      hasher,
      codes,
      emailSender,
      ids,
      clock,
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
    reorderTasks: makeReorderTasks({ tasks, lists, memberships }),
    getList: makeGetList({ lists, memberships }),
    listUserLists: makeListUserLists({ lists }),
    getDailyBoard,
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
    }),
    listMembers: makeListMembers({ lists, memberships, users }),
    removeMember: makeRemoveMember({ lists, memberships }),
    getAnalytics: makeGetAnalytics({ analytics, clock }),
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
  }
}

function buildListGenerator(): ListGenerator {
  const model = process.env.AI_MODEL?.trim()
  if (model) {
    return new AiSdkListGenerator(model)
  }
  return new StubListGenerator()
}

function buildEmailSender(): EmailSender {
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    const from = process.env.EMAIL_FROM ?? 'TaskIn <onboarding@resend.dev>'
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
      'http://localhost:3000/api/v1/auth/google/callback',
  })
}

let container: Container | null = null

export function getContainer(): Container {
  if (!container) {
    container = build(
      {
        tasks: new PrismaTaskRepository(prisma),
        users: new PrismaUserRepository(prisma),
        lists: new PrismaListRepository(prisma),
        recurringTasks: new PrismaRecurringTaskRepository(prisma),
        shareLinks: new PrismaShareLinkRepository(prisma),
        memberships: new PrismaMembershipRepository(prisma),
        emailVerifications: new PrismaEmailVerificationRepository(prisma),
        analytics: new PrismaAnalyticsRepository(prisma),
        notifications: new PrismaNotificationRepository(prisma),
        apiKeys: new PrismaApiKeyRepository(prisma),
      },
      {
        hasher: new Argon2PasswordHasher(new ScryptPasswordHasher()),
        keyHasher: new Sha256KeyHasher(),
        emailSender: buildEmailSender(),
        oauth: buildGoogleProvider(),
        listGenerator: buildListGenerator(),
      },
    )
  }
  return container
}
