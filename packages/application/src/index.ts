export type { Clock } from './ports/clock'
export type { IdGenerator } from './ports/id-generator'
export type { TaskRepository } from './ports/task-repository'
export { NotFoundError } from './errors/use-case-error'
export {
  createTaskSchema,
  taskViewSchema,
  type CreateTaskInput,
  type TaskView,
} from './dtos/task-dto'
export { toTaskView } from './mappers/task-mapper'
export { makeCreateTask } from './use-cases/create-task'
export { makeCompleteTask } from './use-cases/complete-task'
export { InMemoryTaskRepository } from './testing/in-memory-task-repository'
