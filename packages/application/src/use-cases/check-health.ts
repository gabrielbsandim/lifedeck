import type { Clock } from '@/ports/clock'
import type { HealthProbe } from '@/ports/health-probe'
import type {
  HealthComponentView,
  HealthReportView,
  HealthStatus,
} from '@/dtos/health-dto'

type Dependencies = {
  probes: HealthProbe[]
  clock: Clock
  version?: string
}

export function makeCheckHealth({ probes, clock, version }: Dependencies) {
  return async function checkHealth(): Promise<HealthReportView> {
    const components = await Promise.all(
      probes.map(async (probe): Promise<HealthComponentView> => {
        const startedAt = clock.now().getTime()
        try {
          const result = await probe.check()
          return {
            name: probe.name,
            status: result.healthy ? 'up' : 'down',
            latencyMs: clock.now().getTime() - startedAt,
            detail: result.detail,
          }
        } catch (error) {
          return {
            name: probe.name,
            status: 'down',
            latencyMs: clock.now().getTime() - startedAt,
            detail: error instanceof Error ? error.message : 'check failed',
          }
        }
      }),
    )

    const upCount = components.filter(
      component => component.status === 'up',
    ).length
    const status: HealthStatus =
      upCount === components.length ? 'ok' : upCount === 0 ? 'down' : 'degraded'

    return {
      status,
      checkedAt: clock.now().toISOString(),
      version,
      components,
    }
  }
}
