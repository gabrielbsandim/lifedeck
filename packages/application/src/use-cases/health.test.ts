import { describe, expect, it } from 'vitest'
import { makeCheckHealth } from '@/use-cases/check-health'
import type { Clock } from '@/ports/clock'
import type { HealthProbe } from '@/ports/health-probe'

const clock: Clock = {
  now: () => new Date('2026-06-23T12:00:00.000Z'),
}

function probe(name: string, healthy: boolean, detail?: string): HealthProbe {
  return { name, check: async () => ({ healthy, detail }) }
}

function failingProbe(name: string, message: string): HealthProbe {
  return {
    name,
    check: async () => {
      throw new Error(message)
    },
  }
}

describe('checkHealth', () => {
  it('reports ok when every probe is healthy', async () => {
    const checkHealth = makeCheckHealth({
      probes: [probe('database', true), probe('cache', true)],
      clock,
      version: 'abc1234',
    })
    const report = await checkHealth()

    expect(report.status).toBe('ok')
    expect(report.version).toBe('abc1234')
    expect(report.checkedAt).toBe('2026-06-23T12:00:00.000Z')
    expect(report.components).toHaveLength(2)
    expect(report.components.every(c => c.status === 'up')).toBe(true)
    expect(typeof report.components[0]?.latencyMs).toBe('number')
  })

  it('reports degraded when some probes are down', async () => {
    const checkHealth = makeCheckHealth({
      probes: [probe('database', true), probe('cache', false, 'no connection')],
      clock,
    })
    const report = await checkHealth()

    expect(report.status).toBe('degraded')
    const cache = report.components.find(c => c.name === 'cache')
    expect(cache?.status).toBe('down')
    expect(cache?.detail).toBe('no connection')
  })

  it('reports down when all probes are down', async () => {
    const checkHealth = makeCheckHealth({
      probes: [probe('database', false)],
      clock,
    })
    const report = await checkHealth()

    expect(report.status).toBe('down')
  })

  it('treats a thrown probe error as a down component', async () => {
    const checkHealth = makeCheckHealth({
      probes: [failingProbe('database', 'connection refused')],
      clock,
    })
    const report = await checkHealth()

    expect(report.status).toBe('down')
    expect(report.components[0]?.detail).toBe('connection refused')
  })

  it('reports ok when there are no probes', async () => {
    const checkHealth = makeCheckHealth({ probes: [], clock })
    const report = await checkHealth()

    expect(report.status).toBe('ok')
    expect(report.components).toHaveLength(0)
  })
})
