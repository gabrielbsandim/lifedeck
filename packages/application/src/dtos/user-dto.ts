import { z } from 'zod'

export const guestSignInSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  locale: z.string().trim().min(2).max(10).optional(),
})

export type GuestSignInInput = z.infer<typeof guestSignInSchema>

export const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
})

export type RegisterInput = z.infer<typeof registerSchema>

export const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(200),
})

export type SignInInput = z.infer<typeof signInSchema>

export const verifyEmailSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
})

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
})

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export const renameUserSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
})

export type RenameUserInput = z.infer<typeof renameUserSchema>

export const carryOverModeSchema = z.object({
  mode: z.enum(['manual', 'auto']),
})

export type CarryOverModeInput = z.infer<typeof carryOverModeSchema>

export const userViewSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  email: z.string().nullable(),
  isGuest: z.boolean(),
  isEmailVerified: z.boolean(),
  locale: z.string(),
  carryOverMode: z.enum(['manual', 'auto']),
  createdAt: z.string().datetime(),
})

export type UserView = z.infer<typeof userViewSchema>
