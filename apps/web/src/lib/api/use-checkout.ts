import { useMutation } from '@tanstack/react-query'
import type { CheckoutRequest } from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'

export type CheckoutSession = {
  url: string
}

export function useStartCheckout() {
  return useMutation({
    mutationFn: (input: CheckoutRequest) =>
      apiRequest<CheckoutSession>('/api/v1/billing/checkout', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  })
}
