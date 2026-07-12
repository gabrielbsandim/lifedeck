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
