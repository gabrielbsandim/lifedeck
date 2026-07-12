import { z } from 'zod'

export const checkoutRequestSchema = z.object({
  plan: z.enum(['pro', 'premium']),
  interval: z.enum(['monthly', 'annual']),
  market: z.enum(['BR', 'INTL']),
})

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>

export const subscriptionViewSchema = z.object({
  plan: z.enum(['free', 'pro', 'premium']),
  status: z.enum(['trialing', 'active', 'past_due', 'canceled']),
  provider: z.enum(['asaas', 'stripe']),
  currentPeriodEnd: z.string().datetime().nullable(),
  cancelAtPeriodEnd: z.boolean(),
})

export type SubscriptionView = z.infer<typeof subscriptionViewSchema>
