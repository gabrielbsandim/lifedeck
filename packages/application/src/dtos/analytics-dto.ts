import { z } from 'zod'

export const analyticsViewSchema = z.object({
  from: z.string(),
  to: z.string(),
  totalTasks: z.number(),
  totalCompleted: z.number(),
  completionRate: z.number(),
  currentStreak: z.number(),
  days: z.array(
    z.object({
      date: z.string(),
      completed: z.number(),
    }),
  ),
})

export type AnalyticsView = z.infer<typeof analyticsViewSchema>
