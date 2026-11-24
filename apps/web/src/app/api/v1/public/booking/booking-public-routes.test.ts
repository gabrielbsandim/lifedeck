// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError, SlotTakenError } from '@lifedeck/application'

const booking = {
  getPublicPage: vi.fn(),
  listSlots: vi.fn(),
  request: vi.fn(),
  getManaged: vi.fn(),
  cancelByToken: vi.fn(),
  rescheduleByToken: vi.fn(),
}
const rejectBot = vi.fn()
const enforceBookingSlotsLimit = vi.fn()
const enforceBookingRequestLimit = vi.fn()

vi.mock('@/server/container', () => ({
  getContainer: () => ({ booking }),
}))

vi.mock('@/server/api/booking-guard', async importOriginal => ({
  ...(await importOriginal<object>()),
  rejectBot: () => rejectBot(),
  enforceBookingSlotsLimit: (request: Request) =>
    enforceBookingSlotsLimit(request),
  enforceBookingRequestLimit: (request: Request, email: string) =>
    enforceBookingRequestLimit(request, email),
}))

const { GET: getPage } = await import(
  '@/app/api/v1/public/booking/[slug]/route'
)
const { GET: getSlots } = await import(
  '@/app/api/v1/public/booking/[slug]/slots/route'
)
const { POST: postRequest } = await import(
  '@/app/api/v1/public/booking/[slug]/requests/route'
)
const { GET: getManaged } = await import(
  '@/app/api/v1/public/booking/manage/[token]/route'
)
const { POST: postCancel } = await import(
  '@/app/api/v1/public/booking/manage/[token]/cancel/route'
)
const { POST: postReschedule } = await import(
  '@/app/api/v1/public/booking/manage/[token]/reschedule/route'
)

const BASE = 'https://app.test/api/v1/public/booking'
const slug = { params: Promise.resolve({ slug: 'ana' }) }
const token = { params: Promise.resolve({ token: 'tok' }) }

function post(path: string, body?: unknown): Request {
  return new Request(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const TOO_MANY = new Response(null, { status: 429 })

beforeEach(() => {
  vi.stubEnv('FEATURES_V2', 'true')
  vi.stubEnv('FEATURE_BOOKING', 'true')
  rejectBot.mockResolvedValue(null)
  enforceBookingSlotsLimit.mockResolvedValue(null)
  enforceBookingRequestLimit.mockResolvedValue(null)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('public booking page and slots', () => {
  it('answers 404 while the feature is off', async () => {
    vi.stubEnv('FEATURE_BOOKING', 'false')
    const response = await getPage(new Request(`${BASE}/ana`), slug)
    expect(response.status).toBe(404)
    expect(booking.getPublicPage).not.toHaveBeenCalled()
  })

  it('returns the page and maps an unknown slug to 404', async () => {
    booking.getPublicPage.mockResolvedValueOnce({ slug: 'ana' })
    const found = await getPage(new Request(`${BASE}/ana`), slug)
    expect(await found.json()).toEqual({ data: { slug: 'ana' } })
    booking.getPublicPage.mockRejectedValueOnce(new NotFoundError('page'))
    expect((await getPage(new Request(`${BASE}/ana`), slug)).status).toBe(404)
  })

  it('passes the query through to the slot lookup', async () => {
    booking.listSlots.mockResolvedValue([])
    const url = `${BASE}/ana/slots?serviceId=s1&from=a&to=b`
    const response = await getSlots(new Request(url), slug)
    expect(response.status).toBe(200)
    expect(booking.listSlots).toHaveBeenCalledWith('ana', {
      serviceId: 's1',
      from: 'a',
      to: 'b',
    })
  })

  it('stops a caller over the slot limit', async () => {
    enforceBookingSlotsLimit.mockResolvedValue(TOO_MANY)
    expect((await getPage(new Request(`${BASE}/ana`), slug)).status).toBe(429)
    expect((await getSlots(new Request(`${BASE}/ana`), slug)).status).toBe(429)
    expect((await getManaged(new Request(BASE), token)).status).toBe(429)
    expect((await postCancel(post('/x'), token)).status).toBe(429)
    expect((await postReschedule(post('/x', {}), token)).status).toBe(429)
    expect(booking.listSlots).not.toHaveBeenCalled()
  })
})

describe('public booking request', () => {
  const body = { serviceId: 's1', email: 'joao@mail.com', name: 'João' }

  it('books and answers 201', async () => {
    booking.request.mockResolvedValue({ bookingId: 'b1' })
    const response = await postRequest(post('/ana/requests', body), slug)
    expect(response.status).toBe(201)
    expect(booking.request).toHaveBeenCalledWith('ana', body)
    expect(enforceBookingRequestLimit).toHaveBeenCalledWith(
      expect.any(Request),
      'joao@mail.com',
    )
  })

  it('maps a lost race to 409', async () => {
    booking.request.mockRejectedValue(new SlotTakenError())
    const response = await postRequest(post('/ana/requests', body), slug)
    expect(response.status).toBe(409)
  })

  it('blocks a bot before reading the body', async () => {
    rejectBot.mockResolvedValue(new Response(null, { status: 403 }))
    const response = await postRequest(post('/ana/requests', body), slug)
    expect(response.status).toBe(403)
    expect(booking.request).not.toHaveBeenCalled()
  })

  it('quietly drops a filled honeypot', async () => {
    const response = await postRequest(
      post('/ana/requests', { ...body, website: 'spam' }),
      slug,
    )
    expect(response.status).toBe(202)
    expect(booking.request).not.toHaveBeenCalled()
    expect(enforceBookingRequestLimit).not.toHaveBeenCalled()
  })

  it('applies the request limit, even without an email', async () => {
    enforceBookingRequestLimit.mockResolvedValue(TOO_MANY)
    const response = await postRequest(post('/ana/requests', {}), slug)
    expect(response.status).toBe(429)
    expect(enforceBookingRequestLimit).toHaveBeenCalledWith(
      expect.any(Request),
      '',
    )
  })
})

describe('managing by link', () => {
  it('reads, cancels and reschedules by token', async () => {
    booking.getManaged.mockResolvedValue({ status: 'confirmed' })
    booking.cancelByToken.mockResolvedValue({ status: 'cancelled' })
    booking.rescheduleByToken.mockResolvedValue({ status: 'confirmed' })
    expect((await getManaged(new Request(BASE), token)).status).toBe(200)
    expect(booking.getManaged).toHaveBeenCalledWith('tok')

    await postCancel(post('/manage/tok/cancel'), token)
    expect(booking.cancelByToken).toHaveBeenCalledWith('tok', {})
    await postCancel(post('/manage/tok/cancel', { reason: 'Ill' }), token)
    expect(booking.cancelByToken).toHaveBeenLastCalledWith('tok', {
      reason: 'Ill',
    })

    const startsAt = '2026-06-23T10:00:00.000Z'
    await postReschedule(post('/manage/tok/reschedule', { startsAt }), token)
    expect(booking.rescheduleByToken).toHaveBeenCalledWith('tok', { startsAt })
  })
})
