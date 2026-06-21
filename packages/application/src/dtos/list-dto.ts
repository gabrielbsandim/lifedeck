import { z } from 'zod'

export const createListSchema = z.object({
  title: z.string().trim().min(1).max(120),
  type: z.enum(['daily', 'standalone']).optional(),
  visibility: z.enum(['private', 'link']).optional(),
  referenceDate: z.string().date().optional(),
})

export type CreateListInput = z.infer<typeof createListSchema>

export const listViewSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  title: z.string(),
  type: z.enum(['daily', 'standalone']),
  visibility: z.enum(['private', 'link']),
  referenceDate: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type ListView = z.infer<typeof listViewSchema>
