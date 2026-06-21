import {
  makeCompleteTask,
  makeCreateGuestUser,
  makeCreateList,
  makeCreateTask,
  makeGetList,
  makeGetUser,
  makeListUserLists,
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
  completeTask: ReturnType<typeof makeCompleteTask>
  createGuestUser: ReturnType<typeof makeCreateGuestUser>
  getUser: ReturnType<typeof makeGetUser>
  createList: ReturnType<typeof makeCreateList>
  getList: ReturnType<typeof makeGetList>
  listUserLists: ReturnType<typeof makeListUserLists>
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
    createTask: makeCreateTask({ tasks, ids, clock }),
    completeTask: makeCompleteTask({ tasks, clock }),
    createGuestUser: makeCreateGuestUser({ users, ids, clock }),
    getUser: makeGetUser({ users }),
    createList: makeCreateList({ lists, ids, clock }),
    getList: makeGetList({ lists }),
    listUserLists: makeListUserLists({ lists }),
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
