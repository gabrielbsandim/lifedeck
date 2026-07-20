import { z } from 'zod'

export const habitCadenceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('daily') }),
  z.object({
    kind: z.literal('weekdays'),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1),
  }),
  z.object({
    kind: z.literal('times_per_week'),
    count: z.number().int().min(1).max(7),
  }),
])

export const createHabitSchema = z.object({
  title: z.string().trim().min(1).max(120),
  cadence: habitCadenceSchema,
  checkinHour: z.number().int().min(0).max(23).nullable().optional(),
})

export type CreateHabitInput = z.infer<typeof createHabitSchema>

export const updateHabitSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  cadence: habitCadenceSchema.optional(),
  checkinHour: z.number().int().min(0).max(23).nullable().optional(),
  active: z.boolean().optional(),
})

export type UpdateHabitInput = z.infer<typeof updateHabitSchema>

export const logHabitSchema = z.object({
  // The civil date to mark; defaults to the user's today when omitted.
  date: z.string().date().optional(),
  // false un-marks the day (toggle a mistaken log back off).
  done: z.boolean().optional(),
})

export type LogHabitInput = z.infer<typeof logHabitSchema>

export const habitViewSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  title: z.string(),
  cadence: habitCadenceSchema,
  checkinHour: z.number().nullable(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  currentStreak: z.number(),
  doneToday: z.boolean(),
  scheduledToday: z.boolean(),
})

export type HabitView = z.infer<typeof habitViewSchema>
