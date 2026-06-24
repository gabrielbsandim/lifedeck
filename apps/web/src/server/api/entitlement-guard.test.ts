// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

const entitlementsFor = vi.fn()

vi.mock('@/server/container', () => ({
  getContainer: () => ({ entitlements: { for: entitlementsFor } }),
}))

import {
  requireEntitlement,
  requireFeature,
} from '@/server/api/entitlement-guard'

afterEach(() => {
  vi.unstubAllEnvs()
  entitlementsFor.mockReset()
})

describe('requireFeature', () => {
  it('passes through when the feature is enabled', () => {
    vi.stubEnv('FEATURES_V2', 'true')
    vi.stubEnv('FEATURE_CALENDAR', 'true')
    expect(requireFeature('calendar')).toBeNull()
  })

  it('responds 404 when the feature is disabled', () => {
    const result = requireFeature('calendar')
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(404)
  })
})

describe('requireEntitlement', () => {
  it('passes through when the plan grants the entitlement', async () => {
    entitlementsFor.mockResolvedValue({
      plan: 'pro',
      entitlements: ['calendarSync', 'whatsappAssistant'],
    })
    expect(await requireEntitlement('user-1', 'calendarSync')).toBeNull()
  })

  it('responds 403 when the plan lacks the entitlement', async () => {
    entitlementsFor.mockResolvedValue({
      plan: 'free',
      entitlements: ['whatsappAssistant'],
    })
    const result = await requireEntitlement('user-1', 'premiumModel')
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(403)
  })
})
