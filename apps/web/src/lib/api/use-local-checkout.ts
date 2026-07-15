import { useMutation } from '@tanstack/react-query'
import type {
  LocalCheckoutRequest,
  LocalCheckoutResult,
} from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'

/** In-app BR checkout: creates the Asaas Pix or card subscription. */
export function useLocalCheckout() {
  return useMutation({
    mutationFn: (input: LocalCheckoutRequest) =>
      apiRequest<LocalCheckoutResult>('/api/v1/billing/local-checkout', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  })
}
