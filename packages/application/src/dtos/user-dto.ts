import { z } from 'zod'

export const guestSignInSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  locale: z.string().trim().min(2).max(10).optional(),
})

export type GuestSignInInput = z.infer<typeof guestSignInSchema>

export const userViewSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  isGuest: z.boolean(),
  locale: z.string(),
  createdAt: z.string().datetime(),
})

export type UserView = z.infer<typeof userViewSchema>
