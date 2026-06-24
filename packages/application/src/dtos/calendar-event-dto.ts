import { z } from 'zod'
import { recurrenceRuleSchema } from '@/dtos/recurring-task-dto'

const reminders = z.array(z.number().int().min(0)).max(5)

export const createCalendarEventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  allDay: z.boolean().optional(),
  reminders: reminders.optional(),
  recurrence: recurrenceRuleSchema.nullable().optional(),
})

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>

export const updateCalendarEventSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  allDay: z.boolean().optional(),
  reminders: reminders.optional(),
  recurrence: recurrenceRuleSchema.nullable().optional(),
})

export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>

export const listCalendarEventsQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
})

export type ListCalendarEventsQuery = z.infer<
  typeof listCalendarEventsQuerySchema
>

export const calendarEventViewSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  allDay: z.boolean(),
  reminders: z.array(z.number().int()),
  recurrence: recurrenceRuleSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type CalendarEventView = z.infer<typeof calendarEventViewSchema>
