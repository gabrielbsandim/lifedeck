// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isFeatureEnabled } from '@/server/api/features'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isFeatureEnabled', () => {
  it('reports every feature off when the V2 master flag is off', () => {
    vi.stubEnv('FEATURE_CALENDAR', 'true')
    expect(isFeatureEnabled('v2')).toBe(false)
    expect(isFeatureEnabled('calendar')).toBe(false)
  })

  it('enables v2 itself when the master flag is on', () => {
    vi.stubEnv('FEATURES_V2', 'true')
    expect(isFeatureEnabled('v2')).toBe(true)
    expect(isFeatureEnabled('calendar')).toBe(false)
    expect(isFeatureEnabled('whatsapp')).toBe(false)
    expect(isFeatureEnabled('billing')).toBe(false)
    expect(isFeatureEnabled('proactive')).toBe(false)
  })

  it('enables proactive only when the master and proactive flags are on', () => {
    vi.stubEnv('FEATURES_V2', 'true')
    vi.stubEnv('FEATURE_PROACTIVE', 'true')
    expect(isFeatureEnabled('proactive')).toBe(true)
  })

  it('enables a pillar only when both the master and pillar flags are on', () => {
    vi.stubEnv('FEATURES_V2', 'true')
    vi.stubEnv('FEATURE_CALENDAR', 'true')
    expect(isFeatureEnabled('calendar')).toBe(true)
    expect(isFeatureEnabled('whatsapp')).toBe(false)
  })

  it('treats non-true values as off', () => {
    vi.stubEnv('FEATURES_V2', '1')
    expect(isFeatureEnabled('v2')).toBe(false)
  })
})
