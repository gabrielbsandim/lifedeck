import { z } from 'zod'

export const healthStatusSchema = z.enum(['ok', 'degraded', 'down'])

export const healthComponentSchema = z.object({
  name: z.string(),
  status: z.enum(['up', 'down']),
  latencyMs: z.number(),
  detail: z.string().optional(),
})

export const healthReportSchema = z.object({
  status: healthStatusSchema,
  checkedAt: z.string(),
  version: z.string().optional(),
  components: z.array(healthComponentSchema),
})

export type HealthStatus = z.infer<typeof healthStatusSchema>
export type HealthComponentView = z.infer<typeof healthComponentSchema>
export type HealthReportView = z.infer<typeof healthReportSchema>
