import { z } from 'zod'

export const recurrenceRuleSchema = z.object({
  freq: z.enum(['daily', 'weekly', 'monthly']),
  interval: z.number().int().min(1),
  byWeekday: z.array(z.number().int().min(0).max(6)).optional(),
  byMonthday: z.number().int().min(1).max(31).optional(),
  startDate: z.string().date(),
  until: z.string().date().nullable().optional(),
})

export const createRecurringTaskSchema = z.object({
  title: z.string().trim().min(1).max(280),
  rule: recurrenceRuleSchema,
})

export type CreateRecurringTaskInput = z.infer<typeof createRecurringTaskSchema>

export const updateRecurringTaskSchema = z.object({
  title: z.string().trim().min(1).max(280).optional(),
  rule: recurrenceRuleSchema.optional(),
})

export type UpdateRecurringTaskInput = z.infer<typeof updateRecurringTaskSchema>

export const recurringTaskViewSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  title: z.string(),
  rule: recurrenceRuleSchema,
  createdAt: z.string().datetime(),
})

export type RecurringTaskView = z.infer<typeof recurringTaskViewSchema>
