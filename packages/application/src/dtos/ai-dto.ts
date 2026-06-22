import { z } from 'zod'

export const generationBriefSchema = z.object({
  category: z.enum(['wedding', 'trip', 'moving', 'event', 'project', 'other']),
  title: z.string().trim().max(120).optional(),
  targetDate: z.string().date().optional(),
  scale: z.enum(['small', 'medium', 'large']),
  peopleInvolved: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  description: z.string().trim().min(1).max(2000),
  locale: z.enum(['en', 'pt']).default('en'),
})

export type GenerationBrief = z.infer<typeof generationBriefSchema>

export const generatedTaskSchema = z.object({
  title: z.string().trim().min(1).max(280),
  note: z.string().trim().max(2000).optional(),
  suggestedAssignee: z.string().trim().max(80).optional(),
})

export type GeneratedTask = z.infer<typeof generatedTaskSchema>

export const generatedPlanSchema = z.object({
  listTitle: z.string().trim().min(1).max(120),
  sections: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        tasks: z.array(generatedTaskSchema).max(40),
      }),
    )
    .max(12)
    .optional(),
  tasks: z.array(generatedTaskSchema).max(80),
})

export type GeneratedPlan = z.infer<typeof generatedPlanSchema>

export const generatedListViewSchema = z.object({
  title: z.string(),
  tasks: z.array(
    z.object({
      title: z.string(),
      note: z.string().nullable(),
    }),
  ),
})

export type GeneratedListView = z.infer<typeof generatedListViewSchema>
