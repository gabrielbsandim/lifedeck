import { useQuery } from '@tanstack/react-query'
import type { HealthReportView } from '@lifedeck/application'

export const healthKey = ['health'] as const

export function useHealth() {
  return useQuery({
    queryKey: healthKey,
    queryFn: async (): Promise<HealthReportView> => {
      const response = await fetch('/api/v1/health', {
        headers: { 'content-type': 'application/json' },
      })
      const body = (await response.json()) as { data: HealthReportView }
      return body.data
    },
    // No background polling: each poll ran `SELECT 1` on Neon, so a single open
    // /status tab (or an external uptime monitor) kept the compute from ever
    // scaling to zero. The page fetches once on open; users can refresh for a
    // fresh reading.
    staleTime: 60_000,
  })
}
