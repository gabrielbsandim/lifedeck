import {
  makeCreateGuestUser,
  makeCreateList,
  makeCreateTask,
  makeGetDailyBoard,
  makeGetList,
  makeGetUser,
  makeListListTasks,
  makeListUserLists,
  makeUpdateTask,
  type ListRepository,
  type RecurringTaskRepository,
  type TaskRepository,
  type UserRepository,
} from '@taskin/application'
import {
  PrismaListRepository,
  PrismaRecurringTaskRepository,
  PrismaTaskRepository,
  PrismaUserRepository,
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
}

type Repositories = {
  tasks: TaskRepository
  users: UserRepository
  lists: ListRepository
  recurringTasks: RecurringTaskRepository
}

function build({
  tasks,
  users,
  lists,
  recurringTasks,
}: Repositories): Container {
  const clock = new SystemClock()
  const ids = new UuidGenerator()
  return {
    createTask: makeCreateTask({ tasks, lists, ids, clock }),
    updateTask: makeUpdateTask({ tasks, lists, clock }),
    listListTasks: makeListListTasks({ tasks, lists }),
    createGuestUser: makeCreateGuestUser({ users, ids, clock }),
    getUser: makeGetUser({ users }),
    createList: makeCreateList({ lists, ids, clock }),
    getList: makeGetList({ lists }),
    listUserLists: makeListUserLists({ lists }),
    getDailyBoard: makeGetDailyBoard({
      lists,
      tasks,
      recurringTasks,
      ids,
      clock,
    }),
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
    })
  }
  return container
}
