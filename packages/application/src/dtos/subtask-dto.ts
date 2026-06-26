import { z } from 'zod'

export const createSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(280),
})

export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>

export const updateSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(280).optional(),
  status: z.enum(['pending', 'completed']).optional(),
})

export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>

export const subtaskViewSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  title: z.string(),
  status: z.enum(['pending', 'completed']),
  position: z.number(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
})

export type SubtaskView = z.infer<typeof subtaskViewSchema>

export const reorderSubtasksSchema = z.object({
  subtaskIds: z.array(z.string().uuid()),
})

export type ReorderSubtasksInput = z.infer<typeof reorderSubtasksSchema>

export const subtaskSummarySchema = z.object({
  total: z.number(),
  completed: z.number(),
})

export type SubtaskSummary = z.infer<typeof subtaskSummarySchema>
