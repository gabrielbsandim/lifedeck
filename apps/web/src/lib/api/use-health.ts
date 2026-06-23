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
    refetchInterval: 15_000,
  })
}
