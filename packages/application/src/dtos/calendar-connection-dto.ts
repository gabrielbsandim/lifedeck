import { z } from 'zod'

export const calendarConnectionViewSchema = z.object({
  id: z.string().uuid(),
  provider: z.string(),
  accountEmail: z.string().nullable(),
  isDefault: z.boolean(),
  connectedAt: z.string().datetime(),
})

export type CalendarConnectionView = z.infer<
  typeof calendarConnectionViewSchema
>
