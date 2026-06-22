import { z } from 'zod'

export const createShareLinkSchema = z.object({
  role: z.enum(['editor', 'viewer']).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
})

export type CreateShareLinkInput = z.infer<typeof createShareLinkSchema>

export const inviteToListSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(['editor', 'viewer']).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
})

export type InviteToListInput = z.infer<typeof inviteToListSchema>

export const shareLinkViewSchema = z.object({
  id: z.string().uuid(),
  listId: z.string().uuid(),
  token: z.string(),
  role: z.enum(['owner', 'editor', 'viewer']),
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
})

export type ShareLinkView = z.infer<typeof shareLinkViewSchema>
