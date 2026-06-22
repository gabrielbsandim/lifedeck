import { useQuery } from '@tanstack/react-query'
import type { AnalyticsView } from '@taskin/application'
import { apiRequest } from '@/lib/api/client'

export const analyticsKey = (days: number) => ['analytics', days] as const

export function useAnalytics(days: number) {
  return useQuery({
    queryKey: analyticsKey(days),
    queryFn: () => apiRequest<AnalyticsView>(`/api/v1/analytics?days=${days}`),
  })
}
