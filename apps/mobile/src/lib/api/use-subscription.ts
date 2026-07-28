// Ported verbatim from apps/web/src/lib/api/use-subscription.ts. Both apps speak the same
// `/api/v1` surface and share the request contract through @lifedeck/client, so
// only the injected transport differs (Bearer token here, cookie on the web).
// Keep the two in sync when either changes.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SubscriptionView } from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'

export const subscriptionKey = ['billing-subscription'] as const

export function useSubscription(enabled = true) {
  return useQuery({
    queryKey: subscriptionKey,
    queryFn: () =>
      apiRequest<{ subscription: SubscriptionView | null }>(
        '/api/v1/billing/subscription',
      ),
    enabled,
  })
}

export function useCancelSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiRequest<{ cancelAtPeriodEnd: boolean }>('/api/v1/billing/cancel', {
        method: 'POST',
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionKey })
    },
  })
}
