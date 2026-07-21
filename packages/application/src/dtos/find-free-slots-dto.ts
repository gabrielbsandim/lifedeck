import { z } from 'zod'

// Input for smart scheduling. `from`/`to` bound the search window (UTC ISO);
// the work-day window and quiet hours come from the user's assistant profile,
// with optional per-request overrides. All hour fields are local hours (0-23).
export const findFreeSlotsInputSchema = z
  .object({
    durationMin: z.number().int().min(5).max(1440),
    from: z.string().datetime(),
    to: z.string().datetime(),
    workDayStart: z.number().int().min(0).max(23).optional(),
    workDayEnd: z.number().int().min(0).max(23).optional(),
    granularityMin: z.number().int().min(5).max(240).optional(),
    maxResults: z.number().int().min(1).max(50).optional(),
  })
  .refine(data => Date.parse(data.to) > Date.parse(data.from), {
    message: 'The end of the window must be after its start.',
    path: ['to'],
  })

export type FindFreeSlotsInput = z.infer<typeof findFreeSlotsInputSchema>

export const freeSlotViewSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
})

export type FreeSlotView = z.infer<typeof freeSlotViewSchema>
