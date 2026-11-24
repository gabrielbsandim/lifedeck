import { useMutation } from '@tanstack/react-query'
import type {
  LocalCheckoutRequest,
  LocalCheckoutResult,
} from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'
import { INLINE_ERROR } from '@/lib/api/mutation-feedback'

/** In-app BR checkout: creates the Asaas Pix or card subscription. */
export function useLocalCheckout() {
  return useMutation({
    meta: INLINE_ERROR,
    mutationFn: (input: LocalCheckoutRequest) =>
      apiRequest<LocalCheckoutResult>('/api/v1/billing/local-checkout', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  })
}
