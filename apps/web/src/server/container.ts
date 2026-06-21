import {
  makeCompleteTask,
  makeCreateTask,
  type TaskRepository,
} from '@taskin/application'
import {
  PrismaTaskRepository,
  SystemClock,
  UuidGenerator,
  prisma,
} from '@taskin/infrastructure'

type Container = {
  createTask: ReturnType<typeof makeCreateTask>
  completeTask: ReturnType<typeof makeCompleteTask>
}

function build(tasks: TaskRepository): Container {
  const clock = new SystemClock()
  const ids = new UuidGenerator()
  return {
    createTask: makeCreateTask({ tasks, ids, clock }),
    completeTask: makeCompleteTask({ tasks, clock }),
  }
}

let container: Container | null = null

export function getContainer(): Container {
  if (!container) {
    container = build(new PrismaTaskRepository(prisma))
  }
  return container
}
