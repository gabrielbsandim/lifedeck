import {
  makeCreateGuestUser,
  makeCreateList,
  makeCreateRecurringTask,
  makeCreateShareLink,
  makeCreateTask,
  makeDeleteRecurringTask,
  makeGetDailyBoard,
  makeGetList,
  makeGetSharedBoard,
  makeGetUser,
  makeListListTasks,
  makeListRecurringTasks,
  makeListShareLinks,
  makeListUserLists,
  makeRevokeShareLink,
  makeUpdateRecurringTask,
  makeUpdateTask,
  type ListRepository,
  type MembershipRepository,
  type RecurringTaskRepository,
  type ShareLinkRepository,
  type TaskRepository,
  type UserRepository,
} from '@taskin/application'
import {
  PrismaListRepository,
  PrismaMembershipRepository,
  PrismaRecurringTaskRepository,
  PrismaShareLinkRepository,
  PrismaTaskRepository,
  PrismaUserRepository,
  RandomTokenGenerator,
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
}

type Repositories = {
  tasks: TaskRepository
  users: UserRepository
  lists: ListRepository
  recurringTasks: RecurringTaskRepository
  shareLinks: ShareLinkRepository
  memberships: MembershipRepository
}

function build({
  tasks,
  users,
  lists,
  recurringTasks,
  shareLinks,
  memberships,
}: Repositories): Container {
  const clock = new SystemClock()
  const ids = new UuidGenerator()
  const tokens = new RandomTokenGenerator()
  return {
    createTask: makeCreateTask({ tasks, lists, memberships, ids, clock }),
    updateTask: makeUpdateTask({ tasks, lists, memberships, clock }),
    listListTasks: makeListListTasks({ tasks, lists, memberships }),
    createGuestUser: makeCreateGuestUser({ users, ids, clock }),
    getUser: makeGetUser({ users }),
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
  }
}

let container: Container | null = null

export function getContainer(): Container {
  if (!container) {
    container = build({
      tasks: new PrismaTaskRepository(prisma),
      users: new PrismaUserRepository(prisma),
      lists: new PrismaListRepository(prisma),
      recurringTasks: new PrismaRecurringTaskRepository(prisma),
      shareLinks: new PrismaShareLinkRepository(prisma),
      memberships: new PrismaMembershipRepository(prisma),
    })
  }
  return container
}
