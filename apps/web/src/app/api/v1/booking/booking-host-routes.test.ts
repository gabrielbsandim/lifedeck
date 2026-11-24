// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const booking = {
  getSetup: vi.fn(),
  upsertPage: vi.fn(),
  checkSlug: vi.fn(),
  createService: vi.fn(),
  updateService: vi.fn(),
  archiveService: vi.fn(),
  reorderServices: vi.fn(),
  setAvailability: vi.fn(),
  setOverride: vi.fn(),
  deleteOverride: vi.fn(),
  listClients: vi.fn(),
  upsertClient: vi.fn(),
  listBookings: vi.fn(),
  createForClient: vi.fn(),
  confirm: vi.fn(),
  decline: vi.fn(),
  cancel: vi.fn(),
  reschedule: vi.fn(),
  markOutcome: vi.fn(),
}
const entitlementsFor = vi.fn()
const getUserIdFromRequest = vi.fn()
const revalidateTag = vi.fn()

vi.mock('@/server/container', () => ({
  getContainer: () => ({ booking, entitlements: { for: entitlementsFor } }),
}))

vi.mock('@/server/session/session', () => ({
  getUserIdFromRequest: (request: Request) => getUserIdFromRequest(request),
}))

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
}))

const setup = await import('@/app/api/v1/booking/setup/route')
const page = await import('@/app/api/v1/booking/page/route')
const slugCheck = await import('@/app/api/v1/booking/slug-check/route')
const services = await import('@/app/api/v1/booking/services/route')
const reorder = await import('@/app/api/v1/booking/services/reorder/route')
const service = await import('@/app/api/v1/booking/services/[id]/route')
const availability = await import('@/app/api/v1/booking/availability/route')
const overrides = await import(
  '@/app/api/v1/booking/availability/overrides/route'
)
const override = await import(
  '@/app/api/v1/booking/availability/overrides/[date]/route'
)
const clients = await import('@/app/api/v1/booking/clients/route')
const client = await import('@/app/api/v1/booking/clients/[id]/route')
const bookings = await import('@/app/api/v1/booking/bookings/route')
const action = await import('@/app/api/v1/booking/bookings/[id]/[action]/route')

const BASE = 'https://app.test/api/v1/booking'

function call(method: string, path: string, body?: unknown): Request {
  return new Request(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const params = <T>(value: T) => ({ params: Promise.resolve(value) })

beforeEach(() => {
  vi.stubEnv('FEATURES_V2', 'true')
  vi.stubEnv('FEATURE_BOOKING', 'true')
  getUserIdFromRequest.mockResolvedValue('user-1')
  entitlementsFor.mockResolvedValue({ plan: 'pro', entitlements: ['booking'] })
  for (const fn of Object.values(booking)) {
    fn.mockResolvedValue({ ok: true })
  }
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('host booking gates', () => {
  it('hides the routes while the feature is off', async () => {
    vi.stubEnv('FEATURE_BOOKING', '')
    expect((await setup.GET(call('GET', '/setup'))).status).toBe(404)
  })

  it('needs a session', async () => {
    getUserIdFromRequest.mockResolvedValue(null)
    expect((await setup.GET(call('GET', '/setup'))).status).toBe(401)
  })

  it('needs the booking entitlement', async () => {
    entitlementsFor.mockResolvedValue({ plan: 'free', entitlements: [] })
    expect((await setup.GET(call('GET', '/setup'))).status).toBe(403)
    expect(booking.getSetup).not.toHaveBeenCalled()
  })

  it('maps a use case failure through the error envelope', async () => {
    booking.getSetup.mockRejectedValue(new Error('boom'))
    expect((await setup.GET(call('GET', '/setup'))).status).toBe(500)
  })

  it('refreshes the public cache after a write, not after a read', async () => {
    await setup.GET(call('GET', '/setup'))
    expect(revalidateTag).not.toHaveBeenCalled()
    await page.PUT(call('PUT', '/page', { slug: 'ana' }))
    expect(revalidateTag).toHaveBeenCalledWith('booking-public', { expire: 0 })
  })
})

describe('host booking setup routes', () => {
  it('routes page, slug and services to their use cases', async () => {
    await page.PUT(call('PUT', '/page', { slug: 'ana' }))
    expect(booking.upsertPage).toHaveBeenCalledWith('user-1', { slug: 'ana' })

    await slugCheck.GET(call('GET', '/slug-check?slug=bia'))
    expect(booking.checkSlug).toHaveBeenCalledWith('user-1', 'bia')
    await slugCheck.GET(call('GET', '/slug-check'))
    expect(booking.checkSlug).toHaveBeenLastCalledWith('user-1', '')

    const created = await services.POST(call('POST', '/services', { a: 1 }))
    expect(created.status).toBe(201)
    await reorder.POST(call('POST', '/services/reorder', { ids: [] }))
    expect(booking.reorderServices).toHaveBeenCalledWith('user-1', { ids: [] })

    await service.PATCH(
      call('PATCH', '/services/s1', { b: 2 }),
      params({ id: 's1' }),
    )
    expect(booking.updateService).toHaveBeenCalledWith('user-1', 's1', { b: 2 })
    await service.DELETE(call('DELETE', '/services/s1'), params({ id: 's1' }))
    expect(booking.archiveService).toHaveBeenCalledWith('user-1', 's1')
  })

  it('routes weekly hours and date overrides', async () => {
    await availability.PUT(call('PUT', '/availability', { weekly: [] }))
    expect(booking.setAvailability).toHaveBeenCalledWith('user-1', {
      weekly: [],
    })
    await overrides.PUT(call('PUT', '/availability/overrides', { date: 'd' }))
    expect(booking.setOverride).toHaveBeenCalledWith('user-1', { date: 'd' })
    const removed = await override.DELETE(
      call('DELETE', '/availability/overrides/2026-06-22'),
      params({ date: '2026-06-22' }),
    )
    expect(removed.status).toBe(204)
    expect(booking.deleteOverride).toHaveBeenCalledWith('user-1', '2026-06-22')
  })
})

describe('host booking records routes', () => {
  it('lists, adds and edits clients', async () => {
    await clients.GET(call('GET', '/clients?search=jo'))
    expect(booking.listClients).toHaveBeenCalledWith('user-1', { search: 'jo' })
    const added = await clients.POST(call('POST', '/clients', { name: 'Jo' }))
    expect(added.status).toBe(201)
    await client.PATCH(
      call('PATCH', '/clients/c1', { name: 'Jo' }),
      params({ id: 'c1' }),
    )
    expect(booking.upsertClient).toHaveBeenLastCalledWith(
      'user-1',
      { name: 'Jo' },
      'c1',
    )
  })

  it('lists bookings with an optional status filter, and books', async () => {
    await bookings.GET(
      call('GET', '/bookings?from=a&to=b&status=pending,confirmed'),
    )
    expect(booking.listBookings).toHaveBeenCalledWith('user-1', {
      from: 'a',
      to: 'b',
      status: ['pending', 'confirmed'],
    })
    await bookings.GET(call('GET', '/bookings?from=a&to=b'))
    expect(booking.listBookings).toHaveBeenLastCalledWith('user-1', {
      from: 'a',
      to: 'b',
      status: undefined,
    })
    const made = await bookings.POST(call('POST', '/bookings', { x: 1 }))
    expect(made.status).toBe(201)
  })

  it.each([
    ['confirm', 'confirm', undefined, []],
    ['decline', 'decline', { reason: 'No' }, [{ reason: 'No' }]],
    ['cancel', 'cancel', undefined, [{}]],
    ['reschedule', 'reschedule', { startsAt: 's' }, [{ startsAt: 's' }]],
    [
      'outcome',
      'markOutcome',
      { outcome: 'no_show' },
      [{ outcome: 'no_show' }],
    ],
  ] as const)('runs %s on a booking', async (name, method, body, rest) => {
    const response = await action.POST(
      call('POST', `/bookings/b1/${name}`, body),
      params({ id: 'b1', action: name }),
    )
    expect(response.status).toBe(200)
    expect(booking[method]).toHaveBeenCalledWith('user-1', 'b1', ...rest)
  })

  it('answers 404 for an unknown or inherited action name', async () => {
    for (const name of ['archive', 'toString']) {
      const response = await action.POST(
        call('POST', `/bookings/b1/${name}`),
        params({ id: 'b1', action: name }),
      )
      expect(response.status).toBe(404)
    }
  })
})
