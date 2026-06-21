import {
  makeCompleteTask,
  makeCreateGuestUser,
  makeCreateTask,
  makeGetUser,
  type TaskRepository,
  type UserRepository,
} from '@taskin/application'
import {
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
}

function build(tasks: TaskRepository, users: UserRepository): Container {
  const clock = new SystemClock()
  const ids = new UuidGenerator()
  return {
    createTask: makeCreateTask({ tasks, ids, clock }),
    completeTask: makeCompleteTask({ tasks, clock }),
    createGuestUser: makeCreateGuestUser({ users, ids, clock }),
    getUser: makeGetUser({ users }),
  }
}

let container: Container | null = null

export function getContainer(): Container {
  if (!container) {
    container = build(
      new PrismaTaskRepository(prisma),
      new PrismaUserRepository(prisma),
    )
  }
  return container
}
