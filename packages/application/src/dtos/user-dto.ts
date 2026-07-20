import { z } from 'zod'

export const guestSignInSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  locale: z.string().trim().min(2).max(10).optional(),
  timezone: z.string().trim().min(1).max(60).optional(),
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

export const timezoneSchema = z.object({
  timezone: z.string().trim().min(1).max(60),
})

export type TimezoneInput = z.infer<typeof timezoneSchema>

export const reminderPreferencesSchema = z.object({
  email: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
})

export type ReminderPreferencesInput = z.infer<typeof reminderPreferencesSchema>

// null (or a blank string, which the domain normalizes away) clears the saved
// default place used for weather questions.
export const weatherLocationSchema = z.object({
  location: z.string().max(160).nullable(),
})

export type WeatherLocationInput = z.infer<typeof weatherLocationSchema>

export const weatherLocationPreviewSchema = z.object({
  location: z.string().trim().min(1).max(160),
})

export type WeatherLocationPreviewInput = z.infer<
  typeof weatherLocationPreviewSchema
>

export const userViewSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  email: z.string().nullable(),
  isGuest: z.boolean(),
  isEmailVerified: z.boolean(),
  hasPassword: z.boolean(),
  locale: z.string(),
  timezone: z.string(),
  avatarUrl: z.string().nullable(),
  carryOverMode: z.enum(['manual', 'auto']),
  reminderEmail: z.boolean(),
  reminderWhatsapp: z.boolean(),
  weatherLocation: z.string().nullable(),
  plan: z.enum(['free', 'pro', 'premium']).optional(),
  entitlements: z
    .array(
      z.enum([
        'calendarSync',
        'whatsappAssistant',
        'premiumModel',
        'proactiveMessaging',
        'smartScheduling',
      ]),
    )
    .optional(),
  createdAt: z.string().datetime(),
})

export type UserView = z.infer<typeof userViewSchema>
