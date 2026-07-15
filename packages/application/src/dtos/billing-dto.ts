import { z } from 'zod'
import { isValidCpf } from '@lifedeck/domain'

export const checkoutRequestSchema = z.object({
  plan: z.enum(['pro', 'premium']),
  interval: z.enum(['monthly', 'annual']),
  market: z.enum(['BR', 'INTL']),
})

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>

// In-app local (BR) checkout: Pix takes only a CPF; card additionally needs the
// card data plus the billing address Asaas requires for a card charge.
const cpfField = z
  .string()
  .trim()
  .refine(isValidCpf, { message: 'Invalid CPF' })

const localBase = {
  plan: z.enum(['pro', 'premium']),
  interval: z.enum(['monthly', 'annual']),
  cpfCnpj: cpfField,
}

const pixCheckoutSchema = z.object({
  method: z.literal('pix'),
  ...localBase,
})

const cardCheckoutSchema = z.object({
  method: z.literal('card'),
  ...localBase,
  card: z.object({
    holderName: z.string().trim().min(1).max(100),
    number: z.string().regex(/^\d{12,19}$/, 'Invalid card number'),
    expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Invalid month'),
    expiryYear: z.string().regex(/^\d{4}$/, 'Invalid year'),
    ccv: z.string().regex(/^\d{3,4}$/, 'Invalid CVV'),
  }),
  postalCode: z.string().regex(/^\d{5}-?\d{3}$/, 'Invalid postal code'),
  addressNumber: z.string().trim().min(1).max(10),
  phone: z.string().trim().max(20).optional(),
})

export const localCheckoutRequestSchema = z.discriminatedUnion('method', [
  pixCheckoutSchema,
  cardCheckoutSchema,
])

export type LocalCheckoutRequest = z.infer<typeof localCheckoutRequestSchema>

export const pixChargeViewSchema = z.object({
  method: z.literal('pix'),
  encodedImage: z.string(),
  payload: z.string(),
  expiresAt: z.string().nullable(),
})

export const cardChargeViewSchema = z.object({
  method: z.literal('card'),
})

export const localCheckoutResultSchema = z.discriminatedUnion('method', [
  pixChargeViewSchema,
  cardChargeViewSchema,
])

export type LocalCheckoutResult = z.infer<typeof localCheckoutResultSchema>

export const subscriptionViewSchema = z.object({
  plan: z.enum(['free', 'pro', 'premium']),
  status: z.enum(['trialing', 'active', 'past_due', 'canceled']),
  provider: z.enum(['asaas', 'stripe']),
  currentPeriodEnd: z.string().datetime().nullable(),
  cancelAtPeriodEnd: z.boolean(),
})

export type SubscriptionView = z.infer<typeof subscriptionViewSchema>
