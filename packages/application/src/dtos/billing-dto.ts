import { z } from 'zod'

export const checkoutRequestSchema = z.object({
  plan: z.enum(['pro', 'premium']),
  interval: z.enum(['monthly', 'annual']),
  market: z.enum(['BR', 'INTL']),
})

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>
