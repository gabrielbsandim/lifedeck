import { describe, expect, it } from 'vitest'
import { asEntityId } from '@lifedeck/domain'
import { exportBookingData } from '@/shared/booking-export'
import { OWNER, SERVICE_ID, bookingFixture } from '@/testing/booking-fixture'
import { makeRequestBooking } from '@/use-cases/request-booking'

describe('exportBookingData', () => {
  it('is null for a user who never used booking', async () => {
    const fx = bookingFixture()
    expect(await exportBookingData(fx, OWNER)).toBeNull()
  })

  it('exports the page, hours, clients and every booking', async () => {
    const fx = bookingFixture()
    await fx.seedPage()
    await makeRequestBooking(fx)('ana', {
      serviceId: SERVICE_ID,
      startsAt: '2026-06-23T10:00:00.000Z',
      name: 'João',
      email: 'joao@mail.com',
    })

    const data = await exportBookingData(fx, OWNER)

    expect(data?.page?.slug).toBe('ana')
    expect(data?.services.map(service => service.id)).toEqual([SERVICE_ID])
    expect(data?.weekly).toHaveLength(2)
    expect(data?.clients.map(client => client.email)).toEqual(['joao@mail.com'])
    expect(data?.bookings).toEqual([
      expect.objectContaining({
        serviceName: 'Aula',
        client: expect.objectContaining({ name: 'João' }),
      }),
    ])
  })

  it('keeps the clients of a host whose page is gone', async () => {
    const fx = bookingFixture()
    await fx.seedClient()
    const data = await exportBookingData(fx, asEntityId(OWNER))
    expect(data).toMatchObject({ page: null, services: [], bookings: [] })
    expect(data?.clients).toHaveLength(1)
  })
})
