import { z } from 'zod'

export const createTaskSchema = z.object({
  listId: z.string().uuid(),
  title: z.string().trim().min(1).max(280),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(280).optional(),
  observation: z.string().max(2000).nullable().optional(),
  status: z.enum(['pending', 'completed']).optional(),
})

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

export const taskViewSchema = z.object({
  id: z.string().uuid(),
  listId: z.string().uuid(),
  title: z.string(),
  status: z.enum(['pending', 'completed']),
  observation: z.string().nullable(),
  assigneeId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
})

export type TaskView = z.infer<typeof taskViewSchema>
