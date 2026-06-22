import { z } from 'zod'

export const memberViewSchema = z.object({
  id: z.string().uuid(),
  listId: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string(),
  role: z.enum(['owner', 'editor', 'viewer']),
  addedAt: z.string().datetime(),
})

export type MemberView = z.infer<typeof memberViewSchema>
