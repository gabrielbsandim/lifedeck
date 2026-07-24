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
      total: z.number(),
      completed: z.number(),
    }),
  ),
  // Habit analytics over the same window. `consistency` is check-ins done versus
  // expected (0..1) across active habits; `items` is the per-habit breakdown,
  // best streak first.
  habits: z.object({
    active: z.number(),
    completions: z.number(),
    bestStreak: z.number(),
    consistency: z.number(),
    items: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        currentStreak: z.number(),
        completions: z.number(),
        expected: z.number(),
      }),
    ),
  }),
})

export type AnalyticsView = z.infer<typeof analyticsViewSchema>
