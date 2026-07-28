import { z } from 'zod'
import { PUSH_PLATFORMS } from '@lifedeck/domain'

// Expo hands the app a token of the form `ExponentPushToken[...]`, so the cap is
// generous rather than exact: the format is the provider's to change, and a
// wrong guess here would lock out working devices.
export const registerPushDeviceSchema = z.object({
  token: z.string().trim().min(1).max(255),
  platform: z.enum(PUSH_PLATFORMS as unknown as [string, ...string[]]),
})

export type RegisterPushDeviceInput = z.infer<typeof registerPushDeviceSchema>

export const unregisterPushDeviceSchema = z.object({
  token: z.string().trim().min(1).max(255),
})

export type UnregisterPushDeviceInput = z.infer<
  typeof unregisterPushDeviceSchema
>
