import {
  makeChangePassword,
  makeCreateGuestUser,
  makeCreateList,
  makeCreateRecurringTask,
  makeCreateShareLink,
  makeCreateTask,
  makeDeleteRecurringTask,
  makeDeleteUser,
  makeGetAnalytics,
  makeGetDailyBoard,
  makeGetGoogleAuthUrl,
  makeGetList,
  makeGetSharedBoard,
  makeGetUser,
  makeJoinListByToken,
  makeListListTasks,
  makeListMembers,
  makeListRecurringTasks,
  makeListShareLinks,
  makeListUserLists,
  makeRegisterWithEmail,
  makeRemoveMember,
  makeRenameUser,
  makeRequestEmailVerification,
  makeRevokeShareLink,
  makeSignInWithEmail,
  makeSignInWithGoogle,
  makeUpdateRecurringTask,
  makeUpdateTask,
  makeVerifyEmail,
  type AnalyticsRepository,
  type EmailSender,
  type EmailVerificationRepository,
  type ListRepository,
  type MembershipRepository,
  type OAuthProvider,
  type PasswordHasher,
  type RecurringTaskRepository,
  type ShareLinkRepository,
  type TaskRepository,
  type UserRepository,
} from '@taskin/application'
import {
  ConsoleEmailSender,
  GoogleOAuthProvider,
  NumericCodeGenerator,
  PrismaAnalyticsRepository,
  PrismaEmailVerificationRepository,
  PrismaListRepository,
  PrismaMembershipRepository,
  PrismaRecurringTaskRepository,
  PrismaShareLinkRepository,
  PrismaTaskRepository,
  PrismaUserRepository,
  RandomTokenGenerator,
  ResendEmailSender,
  ScryptPasswordHasher,
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
  createList: ReturnType<typeof makeCreateList>
  getList: ReturnType<typeof makeGetList>
  listUserLists: ReturnType<typeof makeListUserLists>
  getDailyBoard: ReturnType<typeof makeGetDailyBoard>
  createRecurringTask: ReturnType<typeof makeCreateRecurringTask>
  listRecurringTasks: ReturnType<typeof makeListRecurringTasks>
  updateRecurringTask: ReturnType<typeof makeUpdateRecurringTask>
  deleteRecurringTask: ReturnType<typeof makeDeleteRecurringTask>
  createShareLink: ReturnType<typeof makeCreateShareLink>
  listShareLinks: ReturnType<typeof makeListShareLinks>
  revokeShareLink: ReturnType<typeof makeRevokeShareLink>
  getSharedBoard: ReturnType<typeof makeGetSharedBoard>
  joinListByToken: ReturnType<typeof makeJoinListByToken>
  listMembers: ReturnType<typeof makeListMembers>
  removeMember: ReturnType<typeof makeRemoveMember>
  getAnalytics: ReturnType<typeof makeGetAnalytics>
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
}

type Services = {
  hasher: PasswordHasher
  emailSender: EmailSender
  oauth: OAuthProvider
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
  }: Repositories,
  { hasher, emailSender, oauth }: Services,
): Container {
  const clock = new SystemClock()
  const ids = new UuidGenerator()
  const tokens = new RandomTokenGenerator()
  const codes = new NumericCodeGenerator()
  return {
    createTask: makeCreateTask({ tasks, lists, memberships, ids, clock }),
    updateTask: makeUpdateTask({ tasks, lists, memberships, clock }),
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
    createList: makeCreateList({ lists, ids, clock }),
    getList: makeGetList({ lists, memberships }),
    listUserLists: makeListUserLists({ lists }),
    getDailyBoard: makeGetDailyBoard({
      lists,
      tasks,
      recurringTasks,
      ids,
      clock,
    }),
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
  }
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
      },
      {
        hasher: new ScryptPasswordHasher(),
        emailSender: buildEmailSender(),
        oauth: buildGoogleProvider(),
      },
    )
  }
  return container
}
