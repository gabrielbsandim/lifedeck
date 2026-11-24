import { useMutation } from '@tanstack/react-query'
import type { CheckoutRequest } from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'
import { INLINE_ERROR } from '@/lib/api/mutation-feedback'

export type CheckoutSession = {
  url: string
}

export function useStartCheckout() {
  return useMutation({
    meta: INLINE_ERROR,
    mutationFn: (input: CheckoutRequest) =>
      apiRequest<CheckoutSession>('/api/v1/billing/checkout', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  })
}
