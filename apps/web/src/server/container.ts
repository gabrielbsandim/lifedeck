import {
  makeCreateGuestUser,
  makeCreateList,
  makeCreateTask,
  makeGetDailyList,
  makeGetList,
  makeGetUser,
  makeListListTasks,
  makeListUserLists,
  makeUpdateTask,
  type ListRepository,
  type TaskRepository,
  type UserRepository,
} from '@taskin/application'
import {
  PrismaListRepository,
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
  getDailyList: ReturnType<typeof makeGetDailyList>
}

type Repositories = {
  tasks: TaskRepository
  users: UserRepository
  lists: ListRepository
}

function build({ tasks, users, lists }: Repositories): Container {
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
    getDailyList: makeGetDailyList({ lists, ids, clock }),
  }
}

let container: Container | null = null

export function getContainer(): Container {
  if (!container) {
    container = build({
      tasks: new PrismaTaskRepository(prisma),
      users: new PrismaUserRepository(prisma),
      lists: new PrismaListRepository(prisma),
    })
  }
  return container
}
