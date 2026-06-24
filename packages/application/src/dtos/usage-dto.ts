import { z } from 'zod'

export const usageWindowViewSchema = z.object({
  used: z.number(),
  limit: z.number(),
})

export const usageViewSchema = z.object({
  plan: z.enum(['free', 'pro', 'premium']),
  fiveHour: usageWindowViewSchema,
  weekly: usageWindowViewSchema,
})

export type UsageView = z.infer<typeof usageViewSchema>
