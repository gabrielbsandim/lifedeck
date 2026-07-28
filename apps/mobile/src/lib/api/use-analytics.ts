// Ported verbatim from apps/web/src/lib/api/use-analytics.ts. Both apps speak the same
// `/api/v1` surface and share the request contract through @lifedeck/client, so
// only the injected transport differs (Bearer token here, cookie on the web).
// Keep the two in sync when either changes.
import { useQuery } from '@tanstack/react-query'
import type { AnalyticsView } from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'

export const analyticsKey = (days: number) => ['analytics', days] as const

export function useAnalytics(days: number) {
  return useQuery({
    queryKey: analyticsKey(days),
    queryFn: () => apiRequest<AnalyticsView>(`/api/v1/analytics?days=${days}`),
  })
}
