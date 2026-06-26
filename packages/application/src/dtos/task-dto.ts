import { z } from 'zod'
import { subtaskSummarySchema } from '@/dtos/subtask-dto'

export const createTaskSchema = z.object({
  listId: z.string().uuid(),
  title: z.string().trim().min(1).max(280),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(280).optional(),
  observation: z.string().max(2000).nullable().optional(),
  status: z.enum(['pending', 'completed']).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  isPrivate: z.boolean().optional(),
})

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

export const taskViewSchema = z.object({
  id: z.string().uuid(),
  listId: z.string().uuid(),
  title: z.string(),
  status: z.enum(['pending', 'completed']),
  observation: z.string().nullable(),
  assigneeId: z.string().uuid().nullable(),
  recurringTaskId: z.string().uuid().nullable(),
  isPrivate: z.boolean(),
  position: z.number(),
  carriedFromDate: z.string().date().nullable(),
  carriedForward: z.boolean(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  subtasks: subtaskSummarySchema,
})

export type TaskView = z.infer<typeof taskViewSchema>

export const reorderTasksSchema = z.object({
  taskIds: z.array(z.string().uuid()),
})

export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>
